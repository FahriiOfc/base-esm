// command/vps/edit.js
// ✏️ Edit file (reply dengan source code baru)

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export default {
    name: 'edit',
    aliases: ['ed'],
    category: 'vps',
    description: '✏️ Edit file (reply with new source)',
    ownerOnly: true,

    async execute(ctx) {
        const { args, reply, react, quoted } = ctx;
        await react('⏳');

        if (!args || args.length === 0) {
            await react('❌');
            return '❌ *Cara penggunaan:*\n.edit <path/file.js> (reply dengan source code baru)';
        }

        const userPath = args.join(' ');
        const fullPath = path.resolve(PROJECT_ROOT, userPath);

        if (!fullPath.startsWith(PROJECT_ROOT) && !fullPath.startsWith('/')) {
            await react('❌');
            return '❌ Akses tidak diizinkan.';
        }

        try {
            await fs.access(fullPath);
        } catch {
            await react('❌');
            return `❌ File tidak ditemukan: ${userPath}`;
        }

        let newSource = null;
        if (quoted) {
            if (quoted.text) {
                newSource = quoted.text;
            } else if (quoted.message?.documentMessage) {
                try {
                    const { downloadMediaMessage } = await import('@chaeulso/baileys');
                    const buffer = await downloadMediaMessage(quoted, 'buffer', {}, { logger: console });
                    if (buffer) newSource = buffer.toString('utf8');
                } catch (e) {}
            }
        }

        if (!newSource) {
            await react('❌');
            return '❌ Tidak ada source code baru! Reply ke pesan/file yang berisi source code.';
        }

        try {
            await fs.writeFile(fullPath, newSource, 'utf8');
            const relativePath = path.relative(PROJECT_ROOT, fullPath);
            await react('✅');
            return `✅ *File berhasil diedit!*\n\n📁 ${relativePath}`;

        } catch (error) {
            await react('❌');
            return `❌ Gagal: ${error.message}`;
        }
    }
};