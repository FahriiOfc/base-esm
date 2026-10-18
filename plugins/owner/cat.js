// plugins/owner/cat.js
// 📖 Cat — Baca isi file/document/reply (text polos)
// Alias: isi

import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const CHUNK_LIMIT = 3500;          // batas aman sebelum jadi document

// ============================================================
// HELPER: EXT & MIME
// ============================================================

const TEXT_EXTS = new Set([
    '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx',
    '.json', '.txt', '.md', '.markdown', '.log',
    '.env', '.yml', '.yaml', '.toml', '.ini', '.conf',
    '.sh', '.bash', '.zsh', '.fish',
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    '.xml', '.svg', '.csv', '.tsv',
    '.py', '.rb', '.php', '.go', '.rs', '.java', '.kt',
    '.c', '.h', '.cpp', '.hpp', '.cs', '.swift',
    '.sql', '.graphql', '.gql',
    '.gitignore', '.npmignore', '.dockerignore'
]);

function isTextFile(fileName) {
    if (!fileName) return false;
    const ext = path.extname(String(fileName)).toLowerCase();
    if (TEXT_EXTS.has(ext)) return true;
    // File tanpa ext, cek beberapa nama default
    const base = path.basename(String(fileName)).toLowerCase();
    return ['readme', 'license', 'makefile', 'dockerfile'].includes(base);
}

function looksBinary(buffer) {
    if (!buffer || buffer.length < 4) return false;
    const sample = buffer.subarray(0, Math.min(512, buffer.length));
    let nonText = 0;
    for (const byte of sample) {
        if (byte === 0) return true;
        if (byte < 9 || (byte > 13 && byte < 32)) nonText++;
    }
    return nonText / sample.length > 0.3;
}

// ============================================================
// HELPER: SAFE PATH
// ============================================================

function resolveSafePath(input) {
    const raw = String(input || '').trim();
    if (!raw) throw new Error('Path kosong');
    if (raw.includes('\0')) throw new Error('Path tidak valid');
    if (raw.split(/[\\/]/).includes('..')) throw new Error('Path traversal dilarang');

    const abs = path.isAbsolute(raw)
        ? raw
        : path.resolve(PROJECT_ROOT, raw);

    const normalizedRoot = path.resolve(PROJECT_ROOT);
    const normalizedAbs = path.resolve(abs);

    if (!normalizedAbs.startsWith(normalizedRoot + path.sep) && normalizedAbs !== normalizedRoot) {
        throw new Error('Akses di luar project dilarang');
    }

    return normalizedAbs;
}

// ============================================================
// HELPER: BACA REPLY
// ============================================================

async function readFromQuoted(quoted) {
    if (!quoted?.message) return null;

    const msg = quoted.message;

    // Document (file)
    if (msg.documentMessage) {
        const doc = msg.documentMessage;
        const fileName = doc.fileName || 'document';

        const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
        const stream = await downloadContentFromMessage(doc, 'document');

        let buffer = Buffer.alloc(0);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
            if (buffer.length > MAX_SIZE) throw new Error(`File > ${MAX_SIZE / 1024 / 1024} MB, dilewati`);
        }

        // Kalau binary & bukan text file → skip
        if (looksBinary(buffer) && !isTextFile(fileName)) {
            throw new Error('File binary tidak didukung');
        }

        return {
            fileName,
            buffer,
            content: buffer.toString('utf-8')
        };
    }

    // Text / caption
    let text = null;
    if (typeof msg.conversation === 'string') text = msg.conversation;
    else if (msg.extendedTextMessage?.text) text = msg.extendedTextMessage.text;
    else if (msg.imageMessage?.caption) text = msg.imageMessage.caption;
    else if (msg.videoMessage?.caption) text = msg.videoMessage.caption;
    else if (msg.documentMessage?.caption) text = msg.documentMessage.caption;

    if (text !== null) {
        return {
            fileName: 'quote.txt',
            buffer: Buffer.from(text, 'utf-8'),
            content: text
        };
    }

    return null;
}

// ============================================================
// HELPER: BACA LOCAL FILE / FOLDER
// ============================================================

function readLocalTarget(absPath, displayName) {
    const stat = fs.statSync(absPath);

    if (stat.isDirectory()) {
        const entries = fs.readdirSync(absPath, { withFileTypes: true })
            .filter(e => !e.name.startsWith('.'))
            .map(e => ({
                name: e.name,
                isDir: e.isDirectory()
            }));

        return {
            isDirectory: true,
            path: displayName,
            entries
        };
    }

    if (stat.size > MAX_SIZE) {
        throw new Error(`File > ${MAX_SIZE / 1024 / 1024} MB, dilewati`);
    }

    const buffer = fs.readFileSync(absPath);
    const fileName = path.basename(absPath);

    if (looksBinary(buffer) && !isTextFile(fileName)) {
        throw new Error('File binary tidak didukung');
    }

    return {
        isDirectory: false,
        fileName,
        buffer,
        content: buffer.toString('utf-8')
    };
}

// ============================================================
// HELPER: FORMAT FOLDER LIST
// ============================================================

function formatFolderList(result) {
    if (!result.entries.length) return `📂 *${result.path}*\n\n_(kosong)_`;

    const lines = result.entries.map(e => e.isDir ? `📁 ${e.name}/` : `📄 ${e.name}`);
    return `📂 *${result.path}*\n\n${lines.join('\n')}\n\n_${result.entries.length} item_`;
}

// ============================================================
// COMMAND
// ============================================================

export default {
    name: 'cat',
    aliases: ['isi'],
    category: 'owner',
    description: '📖 Baca isi file/document/reply (text polos)',
    ownerOnly: true,

    async execute(ctx) {
        const { sock, chat, args, quoted, react, message, text } = ctx;

        await react('⏳');

        const argText = (text || args.join(' ') || '').trim();

        let target = null;

        try {
            // Prioritas 1: argumen path lokal
            if (argText) {
                const absPath = resolveSafePath(argText);
                if (!fs.existsSync(absPath)) {
                    await react('❌');
                    return `❌ File/folder *${argText}* tidak ditemukan.`;
                }
                const result = readLocalTarget(absPath, argText);

                if (result.isDirectory) {
                    await react('✅');
                    return formatFolderList(result);
                }
                target = result;
            } else {
                // Prioritas 2: reply document/text
                if (!quoted) {
                    await react('❌');
                    return (
                        `📖 *CAT — Baca isi file*\n\n` +
                        `*Cara pakai:*\n` +
                        `• .cat <path> — baca file lokal\n` +
                        `• .cat <folder> — list isi folder\n` +
                        `• Reply ke file + .cat — baca isi document\n` +
                        `• Reply ke text + .cat — baca text\n\n` +
                        `_Max 5 MB, file binary dilewati._`
                    );
                }
                target = await readFromQuoted(quoted);
                if (!target) {
                    await react('❌');
                    return '❌ Gak ada text/file yang bisa dibaca dari reply itu.';
                }
            }

            // Kirim hasil
            const content = target.content;

            if (content.length <= CHUNK_LIMIT) {
                await react('✅');
                return content;
            }

            // Kepanjangan → kirim sebagai document
            await sock.sendMessage(chat, {
                document: Buffer.from(content, 'utf-8'),
                fileName: target.fileName.replace(/\.[^.]+$/, '') + '.txt',
                mimetype: 'text/plain',
                caption: `📖 *${target.fileName}*\n${content.length} karakter`
            }, { quoted: message });

            await react('✅');

        } catch (error) {
            console.error('[CAT]', error.message);
            await react('❌');
            return `❌ ${error.message}`;
        }
    }
};