// plugins/owner/addcmd.js

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.dirname(path.dirname(__dirname));
const COMMAND_DIR = path.join(PROJECT_ROOT, 'plugins');
const LIB_DIR = path.join(PROJECT_ROOT, 'lib');
const SCRAPER_DIR = path.join(PROJECT_ROOT, 'scraper');

export default {
    name: 'addcmd',
    aliases: ['addgp', 'agp'],
    category: 'owner',
    description: 'Add file to plugins/, lib/, scraper/',
    ownerOnly: true,

    async execute(ctx) {
        const { isOwner, sock, chat, quoted, args, sender } = ctx;

        if (!isOwner) {
            console.log(`[ADDCMD] Blocked non-owner: ${sender}`);
            return;
        }

        const filePath = args.join(' ') || '';

        if (!filePath) {
            return (
                'Masukkan path file yang jelas. Contoh:\n.agp plugins/owner/namafile.js'
            );
        }

        // ============================================================
        // VALIDASI PATH
        // ============================================================

        const normalized = path.normalize(filePath);
        const fullPath = path.resolve(PROJECT_ROOT, normalized);

        const isInCommand = fullPath.startsWith(COMMAND_DIR);
        const isInLib = fullPath.startsWith(LIB_DIR);
        const isInScraper = fullPath.startsWith(SCRAPER_DIR);

        if (!isInCommand && !isInLib && !isInScraper) {
            return '❌ Path harus di plugins/, lib/, scraper/';
        }

        if (!fullPath.endsWith('.js')) {
            return '❌ File harus .js';
        }

        // ============================================================
        // CEK APAKAH FILE SUDAH ADA
        // ============================================================

        try {
            await fs.access(fullPath);
            return (
                `❌ File sudah ada: ${filePath}\n\n` +
                `Gunakan .editcmd ${filePath} untuk mengubah\n` +
                `atau .delcmd ${filePath} untuk menghapus`
            );
        } catch {
            // File tidak ada, lanjut
        }

        // ============================================================
        // AMBIL SOURCE CODE
        // ============================================================

        let source = null;

        if (quoted) {
            const quotedMsg = quoted.message;

            if (quotedMsg?.documentMessage) {
                try {
                    const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
                    const buffer = await downloadMediaMessage(
                        {
                            key: quoted.key,
                            message: quotedMsg
                        },
                        'buffer',
                        {},
                        { logger: console, reuploadRequest: sock.updateMediaMessage }
                    );
                    if (buffer) {
                        source = buffer.toString('utf8');
                        console.log('[ADDCMD] Source from document, size:', source.length);
                    }
                } catch (e) {
                    console.log('[ADDCMD] Download error:', e.message);
                }
            } else if (quoted.text) {
                source = quoted.text;
                console.log('[ADDCMD] Source from quoted text, size:', source.length);
            }
        }

        if (!source) {
            return (
                '❌ Tidak ada source code!\n\n' +
                '📌 *Cara Penggunaan:*\n' +
                '1. `.addcmd plugins/tools/test.js`\n' +
                '2. Reply ke file JavaScript atau pesan yang berisi source code'
            );
        }

        // ============================================================
        // VALIDASI SOURCE (khusus command)
        // ============================================================

        let isCommand = false;
        if (isInCommand) {
            if (!source.includes('export default') || !source.includes('execute')) {
                return '❌ Source code tidak valid! Command harus memiliki format yang benar.';
            }
            isCommand = true;
        }

        // ============================================================
        // SIMPAN KE FILE
        // ============================================================

        try {
            // Buat folder kalau belum ada
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, source, 'utf8');
            console.log('[ADDCMD] File saved:', fullPath);
        } catch (error) {
            return `❌ Gagal menulis file: ${error.message}`;
        }

        // ============================================================
        // REGISTER COMMAND (jika di plugins/)
        // ============================================================

        let resultMessage = `✅ File berhasil dibuat!\n\n📁 ${path.relative(PROJECT_ROOT, fullPath)}`;

        if (isCommand) {
            try {
                const fileUrl = new URL(`file://${fullPath}`);
                const importUrl = `${fileUrl.href}?t=${Date.now()}`;
                const module = await import(importUrl);
                const command = module.default;

                if (!command || typeof command.execute !== 'function') {
                    await fs.unlink(fullPath);
                    return '❌ Command tidak valid! File telah dihapus.';
                }

                const commandLoader = ctx.commandLoader || global.commandLoader;
                if (commandLoader) {
                    await commandLoader.scanCommands();
                    resultMessage += `\n\n✅ Command *${command.name}* langsung aktif tanpa restart!`;
                } else {
                    resultMessage += `\n\n⚠️ Command loader tidak tersedia. Restart bot untuk memuat command.`;
                }

            } catch (error) {
                try {
                    await fs.unlink(fullPath);
                } catch (e) {}
                return `❌ Gagal memuat command: ${error.message}`;
            }
        } else {
            if (isInScraper) {
                resultMessage += `\n\n📦 File scraper berhasil ditambahkan ke scraper/`;
            } else {
                resultMessage += `\n\n📦 File library berhasil ditambahkan ke lib/`;
            }
        }

        return resultMessage;
    }
};
