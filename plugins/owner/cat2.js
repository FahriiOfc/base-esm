// plugins/owner/cat2.js
// 📖 Cat2 — Baca isi file/document/reply (AIRich + code block)
// Alias: isi2

import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const LANG_MAP = {
    '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
    '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
    '.json': 'json',
    '.py': 'python',
    '.rb': 'ruby',
    '.php': 'php',
    '.go': 'golang',
    '.rs': 'rust',
    '.java': 'java',
    '.kt': 'kotlin',
    '.c': 'c', '.h': 'c',
    '.cpp': 'cpp', '.hpp': 'cpp', '.cc': 'cpp',
    '.cs': 'csharp',
    '.swift': 'swift',
    '.html': 'html', '.htm': 'html',
    '.css': 'css', '.scss': 'scss', '.sass': 'sass', '.less': 'less',
    '.xml': 'xml', '.svg': 'xml',
    '.yml': 'yaml', '.yaml': 'yaml',
    '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash', '.fish': 'bash',
    '.sql': 'sql',
    '.md': 'markdown', '.markdown': 'markdown',
    '.txt': 'text', '.log': 'text'
};

const TEXT_EXTS = new Set(Object.keys(LANG_MAP).concat([
    '.env', '.toml', '.ini', '.conf', '.csv', '.tsv',
    '.graphql', '.gql'
]));

function getLanguage(fileName) {
    if (!fileName) return 'javascript';
    const ext = path.extname(String(fileName)).toLowerCase();
    return LANG_MAP[ext] || 'text';
}

function isTextFile(fileName) {
    if (!fileName) return false;
    const ext = path.extname(String(fileName)).toLowerCase();
    if (TEXT_EXTS.has(ext)) return true;
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

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let v = Number(bytes), i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(2)} ${units[i]}`;
}

function resolveSafePath(input) {
    const raw = String(input || '').trim();
    if (!raw) throw new Error('Path kosong');
    if (raw.includes('\0')) throw new Error('Path tidak valid');
    if (raw.split(/[\\/]/).includes('..')) throw new Error('Path traversal dilarang');

    const abs = path.isAbsolute(raw) ? raw : path.resolve(PROJECT_ROOT, raw);
    const normalizedRoot = path.resolve(PROJECT_ROOT);
    const normalizedAbs = path.resolve(abs);

    if (!normalizedAbs.startsWith(normalizedRoot + path.sep) && normalizedAbs !== normalizedRoot) {
        throw new Error('Akses di luar project dilarang');
    }
    return normalizedAbs;
}

async function readFromQuoted(quoted) {
    if (!quoted?.message) return null;
    const msg = quoted.message;

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

        if (looksBinary(buffer) && !isTextFile(fileName)) {
            throw new Error('File binary tidak didukung');
        }

        return { fileName, buffer, content: buffer.toString('utf-8') };
    }

    let text = null;
    if (typeof msg.conversation === 'string') text = msg.conversation;
    else if (msg.extendedTextMessage?.text) text = msg.extendedTextMessage.text;
    else if (msg.imageMessage?.caption) text = msg.imageMessage.caption;
    else if (msg.videoMessage?.caption) text = msg.videoMessage.caption;
    else if (msg.documentMessage?.caption) text = msg.documentMessage.caption;

    if (text !== null) {
        return { fileName: 'quote.txt', buffer: Buffer.from(text, 'utf-8'), content: text };
    }
    return null;
}

function readLocalTarget(absPath, displayName) {
    const stat = fs.statSync(absPath);

    if (stat.isDirectory()) {
        const entries = fs.readdirSync(absPath, { withFileTypes: true })
            .filter(e => !e.name.startsWith('.'))
            .map(e => ({ name: e.name, isDir: e.isDirectory() }));

        return { isDirectory: true, path: displayName, entries };
    }

    if (stat.size > MAX_SIZE) throw new Error(`File > ${MAX_SIZE / 1024 / 1024} MB, dilewati`);

    const buffer = fs.readFileSync(absPath);
    const fileName = path.basename(absPath);

    if (looksBinary(buffer) && !isTextFile(fileName)) {
        throw new Error('File binary tidak didukung');
    }

    return { isDirectory: false, fileName, buffer, content: buffer.toString('utf-8') };
}

async function sendFolderList(sock, chat, message, result) {
    const { AIRich } = await import('../../lib/MessageBuilder.js');

    const entries = result.entries;
    const lines = entries.length
        ? entries.map(e => `${e.isDir ? '📁' : '📄'} ${e.name}${e.isDir ? '/' : ''}`).join('\n')
        : '_(kosong)_';

    await new AIRich(sock)
        .addText(`# 📂 ${result.path}`)
        .addMetadata(`${entries.length} item`)
        .addCode('text', lines)
        .send(chat, { quoted: message, includesSubmessages: false });
}

async function sendAIRichCode(sock, chat, message, target) {
    const { AIRich } = await import('../../lib/MessageBuilder.js');

    const content = target.content;
    const fileName = target.fileName;
    const language = getLanguage(fileName);

    const sizeHuman = formatBytes(target.buffer?.length || Buffer.byteLength(content, 'utf-8'));
    const lines = content.split('\n').length;
    const chars = content.length;
    const title = fileName.toUpperCase();

    await new AIRich(sock)
        .addText(`# 📄 ${title}`)
        .addMetadata(
            `Filename: ${fileName}\n` +
            `Size: ${sizeHuman}\n` +
            `Length: ${chars}\n` +
            `Lines: ${lines}`
        )
        .addCode(language, content)
        .send(chat, { quoted: message, includesSubmessages: false });
}

export default {
    name: 'cat2',
    aliases: ['isi2', 'showcode'],
    category: 'owner',
    description: '📖 Baca isi file/document/reply dengan AIRich code block',
    ownerOnly: true,

    async execute(ctx) {
        const { sock, chat, args, quoted, react, message, text } = ctx;

        await react('⏳');

        const argText = (text || args.join(' ') || '').trim();
        let target = null;

        try {
            if (argText) {
                const absPath = resolveSafePath(argText);
                if (!fs.existsSync(absPath)) {
                    await react('❌');
                    return `❌ File/folder *${argText}* tidak ditemukan.`;
                }
                const result = readLocalTarget(absPath, argText);

                if (result.isDirectory) {
                    await sendFolderList(sock, chat, message, result);
                    await react('✅');
                    return;
                }
                target = result;
            } else {
                if (!quoted) {
                    await react('❌');
                    return (
                        `📖 *CAT2 — Baca isi file (AIRich code)*\n\n` +
                        `*Cara pakai:*\n` +
                        `• .cat2 <path> — baca file lokal\n` +
                        `• .cat2 <folder> — list isi folder\n` +
                        `• Reply ke file + .cat2 — baca isi document\n` +
                        `• Reply ke text + .cat2 — baca text\n\n` +
                        `_Max 5 MB, file binary dilewati._`
                    );
                }
                target = await readFromQuoted(quoted);
                if (!target) {
                    await react('❌');
                    return '❌ Gak ada text/file yang bisa dibaca dari reply itu.';
                }
            }

            await sendAIRichCode(sock, chat, message, target);
            await react('✅');

        } catch (error) {
            console.error('[CAT2]', error.message);
            await react('❌');
            return `❌ ${error.message}`;
        }
    }
};
