// plugins/vps/backup.js
// 💾 Backup - Kirim file ke owner (fake location + thumbnail GitHub)

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import config from '../../config.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// ============================================================
// KONFIGURASI
// ============================================================

const BOT_NAME = config.botName || 'FarrMdV2';
const WA_JID = '0@s.whatsapp.net';
const THUMB_URL = 'https://raw.githubusercontent.com/FahriiOfc/thumb/main/gambar.jpg';

const EXCLUDE_DIRS = ['node_modules', 'auth', 'temp', 'backup', '.git', 'data'];
const EXCLUDE_FILES = ['package-lock.json', '.env'];

// ============================================================
// HELPERS
// ============================================================

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function formatTime(ms) {
    if (ms < 1000) return `${ms.toFixed(0)} ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)} detik`;
    return `${(ms / 60000).toFixed(1)} menit`;
}

function getFolderStats(dir) {
    let folders = 0, files = 0, size = 0;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (EXCLUDE_DIRS.includes(entry.name)) continue;
            if (EXCLUDE_FILES.includes(entry.name)) continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                folders++;
                const sub = getFolderStats(fullPath);
                folders += sub.folders;
                files += sub.files;
                size += sub.size;
            } else {
                files++;
                size += fs.statSync(fullPath).size;
            }
        }
    } catch (e) {}
    return { folders, files, size };
}

function buildExcludeArgs() {
    let args = '';
    for (const dir of EXCLUDE_DIRS) args += ` -x "${dir}/*"`;
    for (const file of EXCLUDE_FILES) args += ` -x "${file}"`;
    return args;
}

// ============================================================
// FAKE LOCATION QUOTE + THUMBNAIL GITHUB
// ============================================================

async function fakeLocationQuote() {
    try {
        const axios = (await import('axios')).default;
        const sharp = (await import('sharp')).default;

        const imgBuf = Buffer.from(
            (await axios.get(THUMB_URL, { responseType: 'arraybuffer' })).data
        );

        const thumb = await sharp(imgBuf)
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 60 })
            .toBuffer();

        console.log('[BACKUP] Thumb size:', thumb.length, 'bytes');

        return {
            key: {
                participant: WA_JID,
                remoteJid: 'status@broadcast',
                fromMe: false
            },
            message: {
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: BOT_NAME,
                    address: 'Backup Script',
                    jpegThumbnail: thumb
                }
            }
        };
    } catch (e) {
        console.error('[BACKUP] Thumb error:', e.message);
        // Fallback tanpa thumbnail
        return {
            key: {
                participant: WA_JID,
                remoteJid: 'status@broadcast',
                fromMe: false
            },
            message: {
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: BOT_NAME,
                    address: 'Backup Script'
                }
            }
        };
    }
}

// ============================================================
// COMMAND
// ============================================================

export default {
    name: 'backup',
    aliases: ['zip', 'backups'],
    category: 'vps',
    description: '💾 Backup project ke ZIP (kirim ke owner)',
    ownerOnly: true,

    async execute(ctx) {
        const { sock, chat, sender, react, reply, message } = ctx;
        const startTime = Date.now();
        await react('⏳');

        const ownerJid = sender;  // Owner = pengirim perintah
        const fakeQuote = await fakeLocationQuote();

        // ============================================================
        // BUBBLE 1: PROGRESS
        // ============================================================

        const stats = getFolderStats(PROJECT_ROOT);
        const sizeFormatted = formatFileSize(stats.size);

        await sock.sendMessage(chat, {
            text:
                `📦 *BACKUP SCRIPT*\n\n` +
                `📁 ${stats.folders} folder\n` +
                `📄 ${stats.files} file\n` +
                `📦 ${sizeFormatted}\n\n` +
                `⏳ Membuat ZIP...`
        }, {
            quoted: fakeQuote
        });

        console.log(`[BACKUP] Stats: ${stats.folders} folders, ${stats.files} files, ${sizeFormatted}`);

        // ============================================================
        // BUAT ZIP
        // ============================================================

        const zipName = `backup-${BOT_NAME}-${Date.now()}.zip`;
        const zipPath = path.join(PROJECT_ROOT, zipName);
        const excludeArgs = buildExcludeArgs();
        const command = `cd ${PROJECT_ROOT} && zip -r ${zipName} . ${excludeArgs}`;

        console.log('[BACKUP] Executing zip...');

        try {
            const { stdout, stderr } = await execAsync(command, {
                timeout: 300000,
                maxBuffer: 1024 * 1024 * 10
            });

            if (stderr && !stderr.includes('zip warning')) {
                console.log('[BACKUP] Zip stderr:', stderr);
            }

            if (!fs.existsSync(zipPath)) throw new Error('File ZIP tidak ditemukan');
            const zipStat = fs.statSync(zipPath);
            if (zipStat.size === 0) throw new Error('File ZIP kosong');

            const zipSize = formatFileSize(zipStat.size);
            const elapsed = formatTime(Date.now() - startTime);

            console.log(`[BACKUP] ZIP: ${zipSize} (${elapsed})`);

            // ============================================================
            // BUBBLE 2: KIRIM FILE KE OWNER (PRIBADI)
            // ============================================================

            const zipBuffer = fs.readFileSync(zipPath);

            await sock.sendMessage(ownerJid, {
                document: zipBuffer,
                fileName: zipName,
                mimetype: 'application/zip',
                caption:
                    `✅ *Backup Berhasil!*\n\n` +
                    `📤 Dikirim ke: Owner (pribadi)\n` +
                    `📊 Ukuran: ${zipSize}\n` +
                    `⏱ Waktu: ${elapsed}\n\n` +
                    `🛡 ${BOT_NAME}`
            }, {
                quoted: fakeQuote
            });

            // ============================================================
            // BUBBLE 3: KONFIRMASI DI CHAT
            // ============================================================

            await sock.sendMessage(chat, {
                text:
                    `✅ *Backup Berhasil!*\n\n` +
                    `📤 File ZIP dikirim ke Owner\n` +
                    `📊 Ukuran: ${zipSize}\n` +
                    `⏱ Waktu: ${elapsed}\n\n` +
                    `👤 @${sender.split('@')[0]}\n` +
                    `🛡 ${BOT_NAME}`,
                contextInfo: {
                    mentionedJid: [sender]
                }
            }, {
                quoted: fakeQuote
            });

            // Cleanup
            try { fs.unlinkSync(zipPath); } catch (e) {}
            await react('✅');

        } catch (error) {
            console.error('[BACKUP] Error:', error.message);
            try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath); } catch (e) {}
            await react('❌');
            await reply(`❌ Gagal backup: ${error.message}`);
        }
    }
};
