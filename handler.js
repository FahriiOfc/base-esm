// handler.js
// FarrMdV2 - Message Dispatcher

import config from './config.js';
import serializer from './lib/serializer.js';
import identity from './lib/identity.js';
import settings from './lib/settings.js';
import * as database from './lib/database.js';
import commandManager from './lib/commandManager.js';
import premium from './lib/premium.js';
import { sendWithReply } from './lib/replyHelper.js';
import { normalizeJid } from './lib/identity.js';
import helper from './lib/helper.js';

// kategori yang wajib punya logs
const LOG_CATEGORIES = new Set([
    'downloader',
    'converter',
    'sticker',
    'media'
]);

// ============================================================
// HANDLER CLASS
// ============================================================

export class Handler {
    #commandLoader;
    #prefixCache = { enabled: true, checkedAt: 0 };

    constructor(commandLoader) {
        this.#commandLoader = commandLoader;
    }
//get sender
    getSender(message) {
        if (!message) return '';
        const key = message.key || {};
        let sender = '';

        if (key.remoteJid && key.remoteJid.endsWith('@g.us')) {
            sender = key.participantAlt || key.participant || '';
        } else {
            sender = key.remoteJidAlt || key.remoteJid || '';
        }

        return normalizeJid(sender);
    }
//prefix mode cached 5 detik
    async #isPrefixEnabled() {
        const now = Date.now();
        if (now - this.#prefixCache.checkedAt < 5000) {
            return this.#prefixCache.enabled;
        }

        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const { fileURLToPath } = await import('url');
            const __dirname = path.dirname(fileURLToPath(import.meta.url));
            const PREFIX_DB = path.join(__dirname, 'database', 'modeprefix.json');

            try {
                const data = JSON.parse(await fs.readFile(PREFIX_DB, 'utf8'));
                this.#prefixCache.enabled = data.enabled !== false;
            } catch {
                this.#prefixCache.enabled = config.modePrefix !== false;
            }
        } catch {
            this.#prefixCache.enabled = true;
        }

        this.#prefixCache.checkedAt = now;
        return this.#prefixCache.enabled;
    }

    // ============================================================
    // HANDLE MESSAGE
    // ============================================================

    async handleMessage(message) {
        try {
            // ---------- BASIC CHECK ----------
            if (!message?.message) return;

            const jid = message.key.remoteJid;
            if (!jid) return;
            if (jid === 'status@broadcast') return;
            if (message.key.fromMe && config.selfResponse !== true) return;

            const sender = this.getSender(message);
            const sock = global.sock || message.sock;
            if (!sock) return;

            // ---------- BLACKLIST ----------
            if (database.isBlUser(sender)) return;
            if (jid.endsWith('@g.us') && database.isBlGrup(jid)) return;

            // ---------- MUTE (SEKALI SAJA) ----------
            if (jid.endsWith('@g.us') && !message.key.fromMe) {
                if (database.isMuted(jid, sender)) {
                    try { await sock.sendMessage(jid, { delete: message.key }); } catch {}
                    return;
                }
            }

            // ---------- SERIALIZE ----------
            const ctx = await serializer.serialize(message, sock);

            // ---------- INJECT REPLY HELPERS ----------
            ctx.replyWithForward = async (text, options = {}) =>
                sendWithReply(sock, ctx.chat, { text: String(text), ...options }, message, options.mentions || [sender]);

            ctx.sendWithForward = async (content, options = {}) =>
                sendWithReply(sock, ctx.chat, content, message, options.mentions || [sender]);

            ctx.reply = async (text, options = {}) =>
                sendWithReply(sock, ctx.chat, { text: String(text), ...options }, message, options.mentions || [sender]);

            ctx.getMediaFromMessage = async () => helper.getMediaFromMessage(message, sock);

            // ---------- AUTO FEATURES ----------
            const currentSettings = settings.get();

            if (currentSettings.autoread) {
                try { await sock.readMessages([message.key]); } catch {}
            }

            if (currentSettings.autovn) {
                try { await helper.handleAutoVn(ctx); } catch {}
            }

            if (currentSettings.autotyping) {
                try { await sock.sendPresenceUpdate('composing', jid); } catch {}
            }

            // ---------- HANDLE LIST RESPONSE ----------
            const isListResponse = !!message?.message?.listResponseMessage;
            if (isListResponse) {
                const handled = await helper.handleListResponse(message, ctx, sock);
                if (handled?.stop) return;
            }

// ---------- HANDLE BUTTON RESPONSE ----------
const isButtonResponse = !!message?.message?.buttonsResponseMessage;
if (isButtonResponse) {
    const handled = await helper.handleButtonResponse(message, ctx, sock);
    if (handled?.stop) return;
}

// ---------- HANDLE INTERACTIVE RESPONSE ----------
const isInteractiveResponse = !!message?.message?.interactiveResponseMessage;
if (isInteractiveResponse) {
    const handled = await helper.handleInteractiveResponse(message, ctx, sock);
    if (handled?.stop) return;
}
            //custom prefix

            if (!isListResponse && !isButtonResponse && !isInteractiveResponse && ctx.text) {
                const rawText = ctx.text;

                // ---------- SELF MODE CHECK (sebelum custom prefix) ----------
                const modeCheck = settings.getValue('mode');
                let allowedBySelfMode = true;

                if (modeCheck === 'self' && !message.key.fromMe) {
                    const isOwner = ctx.isOwner;
                    const isPremium = premium.isPremium(sender);
                    allowedBySelfMode = isOwner || isPremium;
                }

                if (!allowedBySelfMode) {
                    return; //silent kalo bukan owner/premium
                }

                for (const cmd of this.#commandLoader.getCommands().values()) {
                    if (!cmd.customPrefix) continue;

                    // Test regex custom prefix
                    if (!cmd.customPrefix.test(rawText)) continue;

                    console.log(`[CUSTOM PREFIX] ${cmd.name} triggered | ${sender}`);

                    // Set ctx untuk command
                    ctx.commandName = cmd.name;
                    ctx.command = cmd;
                    ctx.text = rawText;       // full text (eval yang handle strip `=>`)
                    ctx.args = rawText.trim().split(/\s+/);

                    // Disable check
                    if (commandManager.isDisabled(cmd.name)) {
                        await ctx.reply(`⚠️ Fitur *${cmd.name}* sedang dalam perbaikan.`);
                        await ctx.react('⚠️');
                        return;
                    }

                    // Permission check (SEBELUM react)
                    const permCheck = await identity.checkCommandPermissions(ctx, cmd);
                    if (!permCheck.allowed) {
                        await ctx.reply(permCheck.reason);
                        await ctx.react('❌');
                        return;
                    }

                    // React setelah semua check lolos
                    await ctx.react('⏳');

                    // Execute
                    try {
                        const result = await cmd.execute(ctx);
                        if (typeof result === 'string' && result.length > 0) {
                            await ctx.reply(result);
                        } else if (result && typeof result === 'object') {
                            const text = result.text || result.message || '';
                            const mentions = result.mentions || [];
                            if (text) await ctx.send({ text, mentions });
                        }
                    } catch (e) {
                        console.error(`[CUSTOM PREFIX ERROR] ${cmd.name}:`, e.message);
                        await ctx.reply(`❌ ${e.message}`);
                        await ctx.react('❌');
                    }
                    return;
                }
            }

            // ---------- PARSE COMMAND ----------
            if (!isListResponse && !isButtonResponse && !isInteractiveResponse) {
    const text = ctx.text;
                if (!text) return;

                const prefixEnabled = await this.#isPrefixEnabled();

                let parsed = serializer.parseCommand(text, config.prefix);

                if (!parsed && !prefixEnabled) {
                    const words = text.trim().split(/\s+/);
                    const firstWord = words[0];
                    const cmd = this.#commandLoader.getCommand(firstWord);
                    if (cmd) {
                        parsed = {
                            prefix: '',
                            command: firstWord,
                            args: words.slice(1),
                            text: words.slice(1).join(' ')
                        };
                    }
                }

                if (!parsed) return;

                ctx.args = parsed.args;
                ctx.text = parsed.text;
                ctx.commandName = parsed.command;
            }

            // ---------- SELF MODE CHECK ----------
            const mode = settings.getValue('mode');

            if (mode === 'self' && !message.key.fromMe) {
                const isOwner = ctx.isOwner;
                const isPremium = premium.isPremium(sender);

                if (!isOwner && !isPremium) return;
            }

            // ---------- FIND COMMAND ----------
            const cmd = this.#commandLoader.getCommand(ctx.commandName);
            if (!cmd) return;

            // ---------- DISABLE CHECK ----------
            if (commandManager.isDisabled(cmd.name)) {
                await ctx.reply(`⚠️ Fitur *${cmd.name}* sedang dalam perbaikan.`);
                await ctx.react('⚠️');
                return;
            }

            // Permission check
            const permCheck = await identity.checkCommandPermissions(ctx, cmd);
            if (!permCheck.allowed) {
                await ctx.reply(permCheck.reason);
                await ctx.react('❌');
                return;
            }

            ctx.command = cmd;
            await ctx.react('⏳');

            // ---------- LOG COMMAND ----------
            console.log(`[CMD] ${cmd.name} | ${sender}`);

            // ---------- EXECUTE ----------
            const startTime = Date.now();
            const category = (cmd.category || '').toLowerCase();
            const isProgressLog = LOG_CATEGORIES.has(category);

            try {
                const result = await cmd.execute(ctx);
                const elapsed = Date.now() - startTime;

                // ---------- LOG PROGRES UNTUK DOWNLOADER/CONVERTER ----------
                if (isProgressLog) {
                    console.log(`[${category.toUpperCase()}] ✅ ${cmd.name} | ${sender} | ${elapsed}ms`);
                }

                if (typeof result === 'string' && result.length > 0) {
                    await ctx.reply(result);
                } else if (result && typeof result === 'object') {
                    const text = result.text || result.message || '';
                    const mentions = result.mentions || [];
                    if (text) await ctx.send({ text, mentions });
                }

            } catch (error) {
                const elapsed = Date.now() - startTime;

                if (isProgressLog) {
                    console.log(`[${category.toUpperCase()}] ❌ ${cmd.name} | ${sender} | ${elapsed}ms | ${error.message}`);
                }

                console.error(`[CMD ERROR] ${cmd.name}:`, error.message);
                await ctx.reply(`❌ ${error.message || 'Terjadi kesalahan'}`);
                await ctx.react('❌');
            }

        } catch (error) {
            console.error('[HANDLER ERROR]', error.message);
        }
    }
}

export default Handler;
