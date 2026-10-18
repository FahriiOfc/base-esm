// plugins/owner/run.js
// 🚀 Run — Execute payload dari file .js
// Support: format CRM Creator (=> ...), script biasa, export default
// Support: reply document (.crm) dan AIRich conversation (.cat2)

import vm from 'vm';
import crypto from 'crypto';
import util from 'util';

export default {
    name: 'run',
    aliases: ['exec', 'ex'],
    category: 'owner',
    description: '🚀 Execute raw payload',
    ownerOnly: true,

    async execute(ctx) {
        const { sock, chat, quoted, react, message, sender } = ctx;

        await react('⏳');

        // ============================================================
        // CEK SUMBER — document (.crm) atau conversation (.cat2)
        // ============================================================

        const hasDocument = !!quoted?.message?.documentMessage;
        const hasConversation = !!quoted?.message?.conversation;

        if (!hasDocument && !hasConversation) {
            await react('❌');
            return '❌ Reply ke file `.js` hasil `.crm` atau AIRich `.cat2`.';
        }

        try {
            let code = '';

            // ============================================================
            // SUMBER 1: DOCUMENT (.crm)
            // ============================================================

            if (hasDocument) {
                const { downloadMediaMessage } = await import('@whiskeysockets/baileys');

                const buffer = await downloadMediaMessage(
                    { key: quoted.key, message: quoted.message },
                    'buffer',
                    {},
                    { logger: console, reuploadRequest: sock.updateMediaMessage }
                );

                if (!buffer?.length) {
                    await react('❌');
                    return '❌ Gagal download file.';
                }

                code = buffer.toString('utf8').trim();
                console.log('[RUN] Source: document');

            // ============================================================
            // SUMBER 2: CONVERSATION (.cat2 AIRich fallback)
            // ============================================================

            } else if (hasConversation) {
                const conv = quoted.message.conversation;

                // Buang baris pertama (header `# 📄 ...`), sisanya = code
                code = conv.replace(/^#[^\n]*\n/, '').trim();

                console.log('[RUN] Source: conversation');
            }

            if (!code || code.length === 0) {
                await react('❌');
                return '❌ Kode kosong.';
            }

            console.log('[RUN] Length:', code.length);
            console.log('[RUN] Preview:', code.slice(0, 120).replace(/\n/g, ' '));

            // ============================================================
            // STRIP HEADER COMMENT
            // ============================================================

            code = code.replace(/^\/\*[\s\S]*?\*\/\s*/m, '').trim();

            // ============================================================
            // DETEKSI FORMAT
            // ============================================================

            let format = 'unknown';

            // Format CRM Creator: `=> conn.relayMessage(...)` atau `> conn.relayMessage(...)`
            if (code.startsWith('=>')) {
                code = code.slice(2).trim();
                format = 'crm-arrow';
            } else if (code.startsWith('>')) {
                code = code.slice(1).trim();
                format = 'crm-relay';
            }
            // Format export default
            else if (code.includes('export default')) {
                format = 'module';
                code = code.replace(/export\s+default\s+/, 'return ');
            }
            // Format script biasa
            else if (code.includes('const ') || code.includes('let ') || code.includes('await ')) {
                format = 'script';
            }

            console.log('[RUN] Format:', format);

            // ============================================================
            // KONTEKS
            // ============================================================

            const m = {
                chat: chat,
                sender: sender,
                key: message.key,
                quoted: quoted,
                reply: async (text) => {
                    await sock.sendMessage(chat, { text: String(text) });
                }
            };

            const conn = sock;

            const context = {
                m: m,
                conn: conn,
                WaSocket: sock,
                sock: sock,
                chat: chat,
                sender: sender,
                console: console,
                Buffer: Buffer,
                crypto: crypto,
                util: util,
                setTimeout: setTimeout,
                clearTimeout: clearTimeout,
                setInterval: setInterval,
                clearInterval: clearInterval,
                Promise: Promise,
                JSON: JSON,
                Object: Object,
                Array: Array,
                String: String,
                Number: Number,
                Boolean: Boolean,
                Math: Math,
                Date: Date,
                RegExp: RegExp,
                Error: Error
            };

            // Tambah baileys exports
            try {
                const baileys = await import('@whiskeysockets/baileys');
                context.generateWAMessageFromContent = baileys.generateWAMessageFromContent;
                context.generateWAMessage = baileys.generateWAMessage;
                context.proto = baileys.proto;
                context.DisconnectReason = baileys.DisconnectReason;
                context.downloadMediaMessage = baileys.downloadMediaMessage;
            } catch (e) {
                console.log('[RUN] Cannot import baileys:', e.message);
            }

            // ============================================================
            // BUNGKUS ASYNC IIFE
            // ============================================================

            const wrappedCode = `(async function farrRun() {
${code}
})()`;

            // ============================================================
            // EXECUTE VIA VM
            // ============================================================

            const script = new vm.Script(wrappedCode, {
                filename: `farr_run_${Date.now()}.js`
            });

            const vmContext = vm.createContext(context);

            const result = await script.runInContext(vmContext);

            console.log('[RUN] ✅ Executed');

            if (result !== undefined) {
                console.log('[RUN] Result:', util.inspect(result, { depth: 2 }).slice(0, 500));
            }

            await react('✅');

        } catch (error) {
            console.error('[RUN] ❌ Error:', error.message);
            console.error('[RUN] Stack:', (error.stack || '').split('\n').slice(0, 5).join('\n'));
            await react('❌');
            return `❌ Execute error: ${error.message}`;
        }
    }
};