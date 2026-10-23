// command/vps/edit.js

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

async function findFileSmart(dir, fileName) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            if (['node_modules', '.git', 'auth', 'temp', 'sessions'].includes(file.name)) continue;
            
            const found = await findFileSmart(fullPath, fileName);
            if (found) return found;
        } else if (file.name === fileName) {
            return fullPath;
        }
    }
    return null;
}

export default {
    name: 'edit',
    aliases: ['ed'],
    category: 'vps',
    description: '✏️ Edit file (Reply text/file) + Smart Search + Auto Reload',
    ownerOnly: true,

    async execute(ctx) {
        const { args, reply, react, quoted } = ctx;
        await react('⏳');

        if (!args || args.length === 0) {
            await react('❌');
            return '❌ *Cara penggunaan:*\n`.edit <nama_file>` (Reply text ATAU Reply file dokumen)\n\n*Contoh:*\n`.edit main.js`';
        }

        const userPath = args.join(' ').trim();
        let fullPath = '';

        if (userPath.includes('/') || userPath.includes('\\')) {
            const checkPath = path.resolve(PROJECT_ROOT, userPath);
            try {
                await fs.access(checkPath);
                fullPath = checkPath;
            } catch {
                const fileName = path.basename(userPath);
                fullPath = await findFileSmart(PROJECT_ROOT, fileName);
            }
        } else {
            fullPath = await findFileSmart(PROJECT_ROOT, userPath);
        }

        if (!fullPath) {
            await react('❌');
            return `❌ File *${userPath}* tidak ditemukan di mana pun.`;
        }

        let newSource = null;

        if (quoted) {
            if (quoted.text) {
                newSource = quoted.text;
            } 
            else if (quoted.message?.documentMessage) {
                try {
                    const buffer = await downloadMediaMessage(quoted, 'buffer', {}, { logger: console });
                    if (buffer) newSource = buffer.toString('utf8');
                } catch (e) {
                    await react('❌');
                    return `❌ Gagal download file dokumen: ${e.message}`;
                }
            }
        }

        if (!newSource) {
            await react('❌');
            return '❌ Tidak ada source code baru! Reply ke pesan *Teks Kode* atau *File Dokumen* yang mau dijadiin isi baru.';
        }

        try {
            await fs.writeFile(fullPath, newSource, 'utf8');
            const relativePath = path.relative(PROJECT_ROOT, fullPath);
            
            let reloadStatus = '';

            if (fullPath.startsWith(path.join(PROJECT_ROOT, 'plugins'))) {
                try {
                    const loader = global.commandLoader;
                    if (loader) {
                        const reloadResult = await loader.reloadCommand(fullPath);
                        reloadStatus = `\n🔄 *Hot Reload:* Berhasil dimuat ulang (${reloadResult.name || 'OK'})`;
                    } else {
                        reloadStatus = `\n⚠️ *Hot Reload:* Gagal (global.commandLoader tidak ditemukan)`;
                    }
                } catch (reloadError) {
                    reloadStatus = `\n⚠️ *Hot Reload Gagal:* ${reloadError.message}\n_(Coba ketik .reload manual)_`;
                }
            } else {
                reloadStatus = `\nℹ️ *Hot Reload:* Diabaikan (bukan file plugin)`;
            }

            await react('✅');
            return `✅ *File berhasil diedit!*\n\n📁 Path: \`${relativePath}\`\n📝 Ukuran Baru: ${Buffer.byteLength(newSource)} bytes${reloadStatus}`;

        } catch (error) {
            await react('❌');
            return `❌ Gagal nulis file: ${error.message}`;
        }
    }
};