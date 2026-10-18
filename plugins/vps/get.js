// command/vps/get.js
// 📥 Download file dari VPS

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export default {
    name: 'get',
    aliases: ['download', 'dlfile'],
    category: 'vps',
    description: '📥 Download file dari VPS',
    ownerOnly: true,

    async execute(ctx) {
        const { sock, chat, args, react, reply, sender } = ctx;

        if (!args || args.length === 0) {
            await react('❌');
            return (
                '📥 *Download File VPS*\n\n' +
                '❌ Masukkan path file!\n\n' +
                '📌 *Contoh:*\n' +
                '.get lib/handler.js\n' +
                '.get config.js\n' +
                '.get command/main/menu.js\n' +
                '.get /etc/hostname\n\n' +
                '📌 *Alias:* .download, .dlfile'
            );
        }

        const userPath = args.join(' ');
        const fullPath = path.resolve(userPath.startsWith('/') ? userPath : path.join(PROJECT_ROOT, userPath));

        // ============================================================
        // CEK PATH (AMAN)
        // ============================================================

        try {
            await fs.access(fullPath);
        } catch {
            await react('❌');
            return `❌ File tidak ditemukan: ${userPath}`;
        }

        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
            await react('❌');
            return `❌ ${userPath} adalah direktori, bukan file. Gunakan .ls untuk melihat isi folder.`;
        }

        // ============================================================
        // BATAS UKURAN FILE
        // ============================================================

        const MAX_SIZE = 50 * 1024 * 1024; // 50MB (batas aman WhatsApp)

        if (stat.size > MAX_SIZE) {
            await react('❌');
            return `❌ File terlalu besar (${(stat.size / 1024 / 1024).toFixed(1)} MB). Maksimal 50 MB.`;
        }

        await react('⏳');

        // ============================================================
        // BACA & KIRIM FILE
        // ============================================================

        try {
            const buffer = await fs.readFile(fullPath);
            const fileName = path.basename(fullPath);
            const relativePath = path.relative(PROJECT_ROOT, fullPath);
            const sizeKB = (stat.size / 1024).toFixed(1);

            // Deteksi MIME type
            const mimeMap = {
                '.js': 'text/javascript',
                '.json': 'application/json',
                '.txt': 'text/plain',
                '.md': 'text/markdown',
                '.html': 'text/html',
                '.css': 'text/css',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.mp4': 'video/mp4',
                '.mp3': 'audio/mpeg',
                '.pdf': 'application/pdf',
                '.zip': 'application/zip',
                '.tar': 'application/x-tar',
                '.gz': 'application/gzip',
                '.log': 'text/plain',
                '.env': 'text/plain',
                '.sh': 'text/plain',
                '.py': 'text/plain',
                '.yml': 'text/plain',
                '.yaml': 'text/plain',
                '.xml': 'text/plain',
            };

            const ext = path.extname(fileName).toLowerCase();
            const mimeType = mimeMap[ext] || 'application/octet-stream';

            // ============================================================
            // FAKE QUOTED HEADER
            // ============================================================

            const fakeQuotedMessage = {
                conversation:
                    `📥 *DOWNLOAD FILE*\n` +
                    `📁 ${relativePath}\n` +
                    `📦 ${sizeKB} KB`
            };

            const fakeStanzaId = `get_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

            // ============================================================
            // KIRIM FILE
            // ============================================================

            await sock.sendMessage(chat, {
                document: buffer,
                fileName: fileName,
                mimetype: mimeType,
                caption: 
                    `📥 *${fileName}*\n\n` +
                    `📁 *Path:* ${relativePath}\n` +
                    `📦 *Size:* ${sizeKB} KB\n` +
                    `📅 *Modified:* ${stat.mtime.toLocaleString('id-ID')}`,
                contextInfo: {
                    quotedMessage: fakeQuotedMessage,
                    stanzaId: fakeStanzaId,
                    participant: sock.user.id,
                    remoteJid: chat,
                    isForwarded: true,
                    forwardingScore: 999,
                    mentionedJid: [sender]
                },
                footer: `📥 FarrMdV1 • ${new Date().toLocaleTimeString('id-ID')}`
            });

            await react('✅');

        } catch (error) {
            console.error('[GET] Error:', error.message);
            await react('❌');
            return `❌ Gagal membaca file: ${error.message}`;
        }
    }
};