// command/vps/get.js
// smart search file
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config.js';
import sharp from 'sharp'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const BOT_NAME = config.botName || 'FarrMdV3';
const HEADER_JID = '13135550002@s.whatsapp.net'; // Meta AI JID
const LOCAL_THUMB = path.join(PROJECT_ROOT, 'thumb', 'thumb.jpg');

async function findFileSmart(dir, fileName) {
    try {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            
            if (file.isDirectory()) {
                const skipFolders = ['proc', 'sys', 'dev', 'node_modules', '.git', 'auth', 'temp', 'sessions', 'boot', 'run'];
                if (skipFolders.includes(file.name)) continue;
                
                const found = await findFileSmart(fullPath, fileName);
                if (found) return found;
            } else if (file.name.toLowerCase() === fileName.toLowerCase()) {
                return fullPath;
            }
        }
    } catch {}
    return null;
}

async function fakeLocationQuote(name, address) {
    try {
        const imgBuf = await fs.readFile(LOCAL_THUMB);

        const thumb = await sharp(imgBuf)
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 60 })
            .toBuffer();

        return {
            key: {
                participant: HEADER_JID,
                remoteJid: 'status@broadcast',
                fromMe: false
            },
            message: {
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: name,
                    address: address,
                    jpegThumbnail: thumb
                }
            }
        };
    } catch (e) {
        console.error('[GET] Thumb error:', e.message);
        return {
            key: {
                participant: HEADER_JID,
                remoteJid: 'status@broadcast',
                fromMe: false
            },
            message: {
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: name,
                    address: address
                }
            }
        };
    }
}

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
            return ('Masukan path atau nama file. Contoh:\n> .get menu.js\n> .get plugins/main/menu.js');}

        const userPath = args.join(' ').trim();
        let fullPath = '';

        await react('⏳');

        if (userPath.includes('/') || userPath.includes('\\')) {
            const checkPath = path.resolve(userPath.startsWith('/') ? userPath : path.join(PROJECT_ROOT, userPath));
            try {
                await fs.access(checkPath);
                fullPath = checkPath;
            } catch {
                fullPath = await findFileSmart('/', path.basename(userPath));
            }
        } else {
            fullPath = await findFileSmart(PROJECT_ROOT, userPath);
            if (!fullPath) {
                fullPath = await findFileSmart('/', userPath);
            }
        }

        if (!fullPath) {
            await react('❌');
            return `❌ File *${userPath}* tidak ditemukan di Project maupun VPS.`;
        }

        let stat;
        try {
            stat = await fs.stat(fullPath);
        } catch {
            await react('❌');
            return `❌ Gagal mengakses file.`;
        }

        if (stat.isDirectory()) {
            await react('❌');
            return `❌ ${userPath} adalah direktori. Gunakan .ls buat liat isinya.`;
        }

        const MAX_SIZE = 50 * 1024 * 1024;
        if (stat.size > MAX_SIZE) {
            await react('❌');
            return `❌ File terlalu besar (${(stat.size / 1024 / 1024).toFixed(1)} MB). Maksimal 50 MB.`;
        }

        try {
            const buffer = await fs.readFile(fullPath);
            const fileName = path.basename(fullPath);
            const relativePath = path.relative(PROJECT_ROOT, fullPath);

            const mimeMap = {
                '.js': 'text/javascript', '.json': 'application/json', '.txt': 'text/plain',
                '.md': 'text/markdown', '.html': 'text/html', '.css': 'text/css',
                '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
                '.mp3': 'audio/mpeg', '.pdf': 'application/pdf', '.zip': 'application/zip',
                '.tar': 'application/x-tar', '.gz': 'application/gzip', '.log': 'text/plain',
                '.env': 'text/plain', '.sh': 'text/plain', '.py': 'text/plain',
                '.yml': 'text/plain', '.yaml': 'text/plain', '.xml': 'text/plain',
            };

            const ext = path.extname(fileName).toLowerCase();
            const mimeType = mimeMap[ext] || 'application/octet-stream';

            const fakeName = `🔍 Mencari: ${userPath}`; 
            const fakeAddress = ''; 

            const fake = await fakeLocationQuote(fakeName, fakeAddress);

            await sock.sendMessage(chat, {
                document: buffer,
                fileName: fileName,
                mimetype: mimeType,
                caption: 
                    `✅ *BERHASIL DIAMBIL*\n\n` +
                    `📁 *Path:* ${relativePath}`,
                contextInfo: {
                    mentionedJid: [sender]
                }
            }, { quoted: fake });

            await react('✅');

        } catch (error) {
            console.error('[GET] Error:', error.message);
            await react('❌');
            return `❌ Gagal membaca file: ${error.message}`;
        }
    }
};
