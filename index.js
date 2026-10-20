// index.js
// FarrMdV2 — Entry Point
// Migrated to @whiskeysockets/baileys (original)
// Fixes:
//  - Keep-alive singleton (no more timer leak per reconnect)
//  - Specific listener removal (no more socket corruption)
//  - Reconnect attempt reset by stable-uptime (not just 'open' event)
//  - Global error handlers (uncaughtException / unhandledRejection)
//  - Health log every 5 minutes
//  - Clean shutdown (clears all timers)

import readline from 'readline';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Boom } from '@hapi/boom';
import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';

import config from './config.js';
import CommandLoader from './lib/commandLoader.js';
import Handler from './handler.js';
import identity from './lib/identity.js';

// ============================================================
// CONSTANTS
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = __dirname;

const PAIRING_CODE = 'FARRMDV2'; //custom pairing code
const SESSION_PATH = path.join(PROJECT_ROOT, config.sessionName || 'auth');
const logger = pino({ level: 'silent' });

const HEALTH_LOG_INTERVAL = 5 * 60 * 1000;   // 5 menit
const STABLE_UPTIME_THRESHOLD = 30 * 1000;   // 30 detik = koneksi dianggap stabil
const KEEPALIVE_INTERVAL = 60 * 1000;        // 60 detik
const SOCKET_CLOSE_TIMEOUT = 5000;           // 5 detik untuk graceful close

// ============================================================
// STATE
// ============================================================

let sock = null;
let saveCreds = null;
let commandHandler = null;

// Timers — SINGLETON, hanya boleh ada 1 instance masing-masing
let reconnectTimer = null;
let keepAliveTimer = null;
let healthLogTimer = null;

// Connection state
let isConnecting = false;
let isShuttingDown = false;
let reconnectAttempts = 0;

// Track kapan koneksi terakhir stabil (untuk reset counter)
let lastStableAt = 0;

// Track message listener agar bisa cleanup tertib
let messageListener = null;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// ============================================================
// HELPERS
// ============================================================

function ts() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `[${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
}

function log(msg) {
    console.log(`${ts()} ${msg}`);
}

function normalizePhone(number) {
    return String(number || '')
        .replace(/\D/g, '')
        .replace(/^0+/, '');
}

function hasSession() {
    return fs.existsSync(path.join(SESSION_PATH, 'creds.json'));
}

function ensureSessionDir() {
    if (!fs.existsSync(SESSION_PATH)) {
        fs.mkdirSync(SESSION_PATH, { recursive: true });
    }
}

function getStatusCode(lastDisconnect) {
    try {
        if (!lastDisconnect?.error) return 0;
        return Boom.isBoom(lastDisconnect.error)
            ? lastDisconnect.error.output.statusCode
            : lastDisconnect.error?.output?.statusCode || 0;
    } catch {
        return 0;
    }
}

function clearTimer(timerRef) {
    if (timerRef) {
        clearTimeout(timerRef);
        return null;
    }
    return timerRef;
}

// ============================================================
// KEEP-ALIVE (SINGLETON)
// ============================================================

function startKeepAlive() {
    if (keepAliveTimer) return; // sudah jalan

    keepAliveTimer = setInterval(() => {
        try {
            if (isShuttingDown) return;
            if (sock?.user && sock?.ws?.readyState === 1) {
                sock.sendPresenceUpdate('available').catch(() => {});
            }
        } catch {}
    }, KEEPALIVE_INTERVAL);

    log('[KEEPALIVE] Started (singleton)');
}

function stopKeepAlive() {
    if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
        log('[KEEPALIVE] Stopped');
    }
}

// ============================================================
// HEALTH LOG
// ============================================================

function startHealthLog() {
    if (healthLogTimer) return;

    healthLogTimer = setInterval(() => {
        try {
            if (isShuttingDown) return;

            const user = sock?.user?.id || '-';
            const wsState = sock?.ws?.readyState ?? -1;
            const stateText = { 0: 'CONNECTING', 1: 'OPEN', 2: 'CLOSING', 3: 'CLOSED' }[wsState] || 'UNKNOWN';
            const mem = process.memoryUsage();
            const memMB = (mem.rss / 1024 / 1024).toFixed(1);

            log(`[HEALTH] user=${user.split('@')[0] || '-'} ws=${stateText} mem=${memMB}MB uptime=${Math.floor(process.uptime() / 60)}m`);
        } catch {}
    }, HEALTH_LOG_INTERVAL);

    log('[HEALTH] Log started (every 5m)');
}

function stopHealthLog() {
    if (healthLogTimer) {
        clearInterval(healthLogTimer);
        healthLogTimer = null;
    }
}

// ============================================================
// MESSAGE HANDLER ATTACH
// ============================================================

function attachMessageHandler() {
    if (!sock) return;

    // Cleanup listener lama (spesifik)
    if (messageListener) {
        try { sock.ev.off('messages.upsert', messageListener); } catch {}
        messageListener = null;
    }

    messageListener = async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const message of messages) {
            try {
                await commandHandler?.handleMessage(message);
            } catch (error) {
                console.error('[HANDLER ERROR]', error?.message || error);
            }
        }
    };

    sock.ev.on('messages.upsert', messageListener);
}

// ============================================================
// RECONNECT
// ============================================================

function scheduleReconnect(delay) {
    // Clear existing timer dulu
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (isShuttingDown) return;
        startConnection();
    }, delay);
}

// Reset counter kalau koneksi sudah stabil cukup lama
function maybeResetReconnectAttempts() {
    if (!lastStableAt) return;
    const stableFor = Date.now() - lastStableAt;
    if (stableFor >= STABLE_UPTIME_THRESHOLD && reconnectAttempts > 0) {
        log(`[RECONNECT] Koneksi stabil ${Math.floor(stableFor / 1000)}s → reset counter (was ${reconnectAttempts})`);
        reconnectAttempts = 0;
    }
}

// ============================================================
// START CONNECTION
// ============================================================

async function startConnection() {
    if (isShuttingDown) return;
    if (isConnecting) return;

    isConnecting = true;
    ensureSessionDir();

    try {
        // Cleanup socket lama
        if (sock) {
            try {
                sock.ev.removeAllListeners('connection.update');
                sock.ev.removeAllListeners('creds.update');
                sock.ev.removeAllListeners('messages.upsert');
            } catch {}
            try { sock.ws?.close?.(); } catch {}
            sock = null;
        }
        messageListener = null;

        const { state, saveCreds: save } = await useMultiFileAuthState(SESSION_PATH);
        saveCreds = save;

        let version = null;
        try {
            const result = await fetchLatestBaileysVersion();
            version = result.version;
            log(`[BAILEYS] Version: ${version.join('.')}`);
        } catch (e) {
            log(`[BAILEYS] fetchLatestVersion gagal: ${e.message}. Pakai default.`);
        }

        const socketConfig = {
            auth: state,
            logger,
            browser: Browsers.ubuntu('Chrome'),
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            markOnlineOnConnect: false,
            syncFullHistory: false,
            generateHighQualityLinkPreview: false
        };

        if (version) socketConfig.version = version;

        sock = makeWASocket(socketConfig);

        // Set global.sock LEBIH AWAL agar handler.js bisa akses
        global.sock = sock;

        sock.ev.on('creds.update', saveCreds);

        // ---------- PAIRING (kalau belum registered) ----------
        if (!state.creds.registered) {
            console.log('');
            console.log('====================================');
            console.log('       FARRMD V2 - PAIRING');
            console.log('====================================');
            console.log('');

            const input = await question('Masukkan nomor WhatsApp (contoh: 628xxxxxxxxxx): ');
            const phoneNumber = normalizePhone(input);

            if (!phoneNumber || phoneNumber.length < 8) {
                console.log('[PAIRING] Nomor tidak valid.');
                rl.close();
                process.exit(1);
            }

            try {
                const code = await sock.requestPairingCode(phoneNumber, PAIRING_CODE);

                console.log('');
                console.log('====================================');
                console.log('          PAIRING CODE');
                console.log('====================================');
                console.log('');
                console.log(`   ${code}`);
                console.log('');
                console.log('Masukkan kode di WhatsApp > Perangkat Tertaut.');
                console.log('');
            } catch (error) {
                console.log(`[PAIRING ERROR] ${error.message}`);
                rl.close();
                process.exit(1);
            } finally {
                try { rl.close(); } catch {}
            }
        }

        // ---------- CONNECTION UPDATE ----------
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'connecting') {
                log('[SYSTEM] Menghubungkan ke WhatsApp...');
            }

            if (connection === 'open') {
                isConnecting = false;
                lastStableAt = Date.now();

                // Reset counter kalau ini koneksi stabil
                maybeResetReconnectAttempts();

                const botJid = sock?.user?.id || '';
                if (botJid) {
                    identity.setBotJid(botJid);
                }

                attachMessageHandler();

                // Start singleton timers (aman, di-guard)
                startKeepAlive();
                startHealthLog();

                log('[SYSTEM] WhatsApp connected');
                log(`[SYSTEM] Bot JID: ${botJid}`);
                log('[SYSTEM] Bot siap menerima pesan.');
            }

            if (connection === 'close') {
                isConnecting = false;

                if (isShuttingDown) return;

                const statusCode = getStatusCode(lastDisconnect);
                const errorMsg = lastDisconnect?.error?.message || '';

                log(`[DISCONNECT] statusCode=${statusCode} msg=${errorMsg || '-'}`);

                // ---------- TIDAK BOLEH RECONNECT ----------
                if (statusCode === DisconnectReason.loggedOut) {
                    log('[SESSION] Logged out. Hapus folder auth/ dan restart manual.');
                    stopKeepAlive();
                    stopHealthLog();
                    return;
                }

                if (statusCode === DisconnectReason.connectionReplaced) {
                    log('[SYSTEM] Koneksi digantikan device lain. Tidak reconnect.');
                    stopKeepAlive();
                    stopHealthLog();
                    return;
                }

                if (statusCode === DisconnectReason.badSession) {
                    log('[SESSION] Bad session. Hapus folder auth/ dan restart manual.');
                    stopKeepAlive();
                    stopHealthLog();
                    return;
                }

                if (statusCode === DisconnectReason.multideviceMismatch) {
                    log('[SESSION] Multidevice mismatch. Perlu pairing ulang.');
                    stopKeepAlive();
                    stopHealthLog();
                    return;
                }

                if (config.reconnect?.enabled !== true) {
                    log('[SYSTEM] Reconnect dinonaktifkan di config.');
                    stopKeepAlive();
                    stopHealthLog();
                    return;
                }

                // ---------- RESET COUNTER KALAU KONEKSI STABIL ----------
                maybeResetReconnectAttempts();

                const maxAttempts = Number(config.reconnect?.maxAttempts || 5);
                if (reconnectAttempts >= maxAttempts) {
                    log(`[RECONNECT] Batas tercapai (${maxAttempts}x). Bot berhenti.`);
                    log('[RECONNECT] Restart manual atau lewat PM2 untuk lanjut.');
                    stopKeepAlive();
                    stopHealthLog();
                    return;
                }

                // ---------- DELAY BERDASARKAN ERROR ----------
                let delay = Number(config.reconnect?.delay || 5000);

                if (errorMsg.includes('Stream Errored')) {
                    delay = 15000;
                } else if (statusCode === DisconnectReason.connectionLost || statusCode === 0) {
                    delay = 8000;
                } else if (statusCode === DisconnectReason.restartRequired) {
                    delay = 3000;
                } else if (statusCode === DisconnectReason.timedOut) {
                    delay = 10000;
                }

                reconnectAttempts++;
                log(`[RECONNECT] ${reconnectAttempts}/${maxAttempts} dalam ${delay / 1000}s`);

                scheduleReconnect(delay);
            }
        });

        return sock;

    } catch (error) {
        isConnecting = false;
        log(`[START ERROR] ${error.message}`);

        if (!reconnectTimer && !isShuttingDown) {
            scheduleReconnect(10000);
        }
    }
}

// ============================================================
// SHUTDOWN
// ============================================================

async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    log(`[${signal}] Menghentikan bot...`);

    // Clear semua timer
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    stopKeepAlive();
    stopHealthLog();

    // Tutup socket dengan timeout
    try {
        if (sock) {
            await Promise.race([
                (async () => {
                    try { sock.ev.removeAllListeners('connection.update'); } catch {}
                    try { sock.ev.removeAllListeners('creds.update'); } catch {}
                    try { sock.ev.removeAllListeners('messages.upsert'); } catch {}
                    try { sock.end(undefined); } catch {}
                })(),
                new Promise((resolve) => setTimeout(resolve, SOCKET_CLOSE_TIMEOUT))
            ]);
        }
    } catch {}

    log('[SYSTEM] Bot dihentikan.');
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ---------- GLOBAL ERROR HANDLERS ----------
process.on('uncaughtException', (error) => {
    console.error(`${ts()} [UNCAUGHT]`, error?.message || error);
    console.error(error?.stack || '');
});

process.on('unhandledRejection', (reason) => {
    console.error(`${ts()} [UNHANDLED REJECTION]`, reason?.message || reason);
    if (reason?.stack) console.error(reason.stack);
});

// ============================================================
// MAIN
// ============================================================

async function main() {
    try {
        console.log('');
        console.log('====================================');
        console.log('       FARRMD V2');
        console.log('       ESM ARCHITECTURE');
        console.log('====================================');
        console.log('');

        // 1. Load commands
        const commandLoader = new CommandLoader();
        await commandLoader.scanCommands();
        global.commandLoader = commandLoader;

        // 2. Buat handler
        commandHandler = new Handler(commandLoader);

        // 3. Connect
        await startConnection();

    } catch (error) {
        console.error('[FATAL ERROR]', error);
        process.exit(1);
    }
}

main();
