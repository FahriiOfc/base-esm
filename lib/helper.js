// lib/helper.js
// FarrMdV2 - Feature Helpers
// YT session, getcmd session, list response, button response, autoVN, media

import path from 'path';
import config from '../config.js';
import serializer from './serializer.js';

// ============================================================
// YT SESSION STORAGE
// ============================================================

if (!global._ytSessions) {
    global._ytSessions = new Map();
}

if (!global.getcmdSessions) {
    global.getcmdSessions = new Map();
}

// ============================================================
// HELPERS
// ============================================================

function decodeData(encoded) {
    try {
        return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    } catch {
        return null;
    }
}

function applyParsed(ctx, fullCommand) {
    const parsed = serializer.parseCommand(fullCommand, config.prefix);
    if (!parsed) return false;
    ctx.args = parsed.args;
    ctx.text = parsed.text;
    ctx.commandName = parsed.command;
    return true;
}

// ============================================================
// LIST RESPONSE HANDLER
// ============================================================

async function handleListResponse(message, ctx, sock) {
    const rowId = message?.message?.listResponseMessage?.singleSelectReply?.selectedRowId || '';
    if (!rowId) return { stop: true };

    const jid = ctx.chat;
    const sender = ctx.sender;

    // -------- GETCMD: COMMAND FOLDER --------
    if (rowId.startsWith('getcmd_cmd_')) {
        const rest = rowId.replace('getcmd_cmd_', '');
        const lastUnderscore = rest.lastIndexOf('_');
        if (lastUnderscore === -1) {
            await ctx.reply('❌ Format rowId tidak valid.');
            await ctx.react('❌');
            return { stop: true };
        }

        const folder = rest.substring(0, lastUnderscore);
        const fileName = rest.substring(lastUnderscore + 1);

        if (fileName && fileName !== 'empty') {
            if (!applyParsed(ctx, `.getcmd plugins/${folder}/${fileName}.js`)) {
                await ctx.reply(`❌ Gagal memproses.`);
                await ctx.react('❌');
                return { stop: true };
            }
        } else {
            await ctx.reply(`📁 *Plugins/${folder}/*\n\nTidak ada file di folder ini.`);
            await ctx.react('📂');
            return { stop: true };
        }
        return { stop: false };
    }

    // -------- GETCMD: LIB --------
    if (rowId.startsWith('getcmd_lib_')) {
        const fileName = rowId.replace('getcmd_lib_', '');
        if (!applyParsed(ctx, `.getcmd lib/${fileName}.js`)) {
            await ctx.reply(`❌ Gagal memproses.`);
            await ctx.react('❌');
            return { stop: true };
        }
        return { stop: false };
    }

    // -------- GETCMD: SCRAPER --------
    if (rowId.startsWith('getcmd_scraper_')) {
        const fileName = rowId.replace('getcmd_scraper_', '');
        if (!applyParsed(ctx, `.getcmd scraper/${fileName}.js`)) {
            await ctx.reply(`❌ Gagal memproses.`);
            await ctx.react('❌');
            return { stop: true };
        }
        return { stop: false };
    }

    // -------- YT: VIDEO --------
    if (rowId.startsWith('yt_video_')) {
        const parts = rowId.replace('yt_video_', '').split('_');
        const sessionId = parts[0];
        const quality = decodeURIComponent(parts.slice(1).join('_'));

        const session = global._ytSessions.get(sessionId);
        if (!session) {
            await ctx.reply('⏳ Session expired (5 menit). Silakan .yt ulang.');
            await ctx.react('❌');
            return { stop: true };
        }

        session.created = Date.now();
        global._ytSessions.set(sessionId, session);

        const video = session.videos.find(v =>
            (v.quality === quality || v.label === quality) && v.url
        );

        if (!video) {
            await ctx.reply('❌ Video tidak ditemukan.');
            await ctx.react('❌');
            return { stop: true };
        }

        const caption = `🎬 *${session.title}*\n⏱️ ${session.duration} | 📊 ${video.quality || 'Unknown'}`;

        try {
            const axios = (await import('axios')).default;
            const response = await axios.get(video.url, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const buffer = Buffer.from(response.data);

            await sock.sendMessage(jid, {
                document: buffer,
                fileName: `${session.title}.mp4`,
                mimetype: 'video/mp4',
                caption: caption + '\n\n📌 Dikirim sebagai dokumen',
                contextInfo: {
                    mentionedJid: [sender],
                    isForwarded: true,
                    forwardingScore: 999
                }
            });

            await ctx.react('✅');
        } catch (error) {
            await ctx.reply(`❌ Gagal download: ${error.message}`);
            await ctx.react('❌');
        }
        return { stop: true };
    }

    // -------- YT: AUDIO --------
    if (rowId.startsWith('yt_audio_')) {
        const parts = rowId.replace('yt_audio_', '').split('_');
        const sessionId = parts[0];
        const quality = decodeURIComponent(parts.slice(1).join('_'));

        const session = global._ytSessions.get(sessionId);
        if (!session) {
            await ctx.reply('⏳ Session expired (5 menit). Silakan .yt ulang.');
            await ctx.react('❌');
            return { stop: true };
        }

        session.created = Date.now();
        global._ytSessions.set(sessionId, session);

        const audio = session.audios.find(a =>
            (a.quality === quality || a.label === quality) && a.url
        );

        if (!audio) {
            await ctx.reply('❌ Audio tidak ditemukan.');
            await ctx.react('❌');
            return { stop: true };
        }

        await sock.sendMessage(jid, {
            audio: { url: audio.url },
            mimetype: 'audio/mpeg',
            fileName: `${session.title}.mp3`,
            contextInfo: {
                mentionedJid: [sender],
                isForwarded: true,
                forwardingScore: 999
            }
        });

        await ctx.react('✅');
        return { stop: true };
    }

    // -------- COMMAND LAINNYA --------
    let cmdName = rowId;
    if (!cmdName.startsWith('.')) cmdName = '.' + cmdName;

    if (!applyParsed(ctx, cmdName)) {
        await ctx.reply(`❌ Plugins tidak dikenali: ${cmdName}`);
        await ctx.react('❌');
        return { stop: true };
    }

    return { stop: false };
}

// ============================================================
// BUTTON RESPONSE HANDLER
// ============================================================

async function handleButtonResponse(message, ctx, sock) {
    const buttonId = message?.message?.buttonsResponseMessage?.selectedButtonId
        || message?.message?.buttonsResponseMessage?.selectedDisplayText
        || '';
    if (!buttonId) return { stop: true };

    const jid = ctx.chat;
    const sender = ctx.sender;

    // -------- LISTCMD BUTTONS --------
    const listcmdMap = {
        listcmd_plugins: '.listcmd plugins/',
        listcmd_lib: '.listcmd lib/',
        listcmd_backup: '.listcmd backup/',
        listcmd_scraper: '.listcmd scraper/'
    };
    if (listcmdMap[buttonId]) {
        applyParsed(ctx, listcmdMap[buttonId]);
        return { stop: false };
    }

    // -------- GETCMD MENU COMMAND --------
    if (buttonId === 'getcmd_menu_plugins') {
        const fs = await import('fs/promises');
        const commandDir = path.join(process.cwd(), 'plugins');

        const entries = await fs.readdir(commandDir, { withFileTypes: true });
        const folders = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

        if (folders.length === 0) {
            await ctx.reply('📁 *plugins/*\n\nTidak ada folder.');
            await ctx.react('❌');
            return { stop: true };
        }

        let totalFiles = 0;
        const sections = [];

        for (const folder of folders) {
            const folderPath = path.join(commandDir, folder);
            const files = await fs.readdir(folderPath);
            const jsFiles = files.filter(f => f.endsWith('.js')).sort();
            totalFiles += jsFiles.length;

            const rows = jsFiles.map(file => ({
                title: `📄 ${file}`,
                rowId: `getcmd_cmd_${folder}_${file.replace('.js', '')}`,
                description: `File di plugind/${folder}`
            }));

            if (rows.length === 0) {
                rows.push({
                    title: '📂 Kosong',
                    rowId: `getcmd_cmd_${folder}_empty`,
                    description: `Tidak ada file di ${folder}/`
                });
            }

            sections.push({ title: `📁 ${folder}/`, rows });
        }

        await sock.sendMessage(jid, {
            text: '📌 *GETCMD - Pilih File*\n\nPilih file yang ingin dilihat source code-nya:',
            title: '📁 Plugins/',
            footer: `📱 Total: ${folders.length} folders, ${totalFiles} files`,
            buttonText: '📋 Buka Daftar',
            sections
        });

        await ctx.react('✅');
        return { stop: true };
    }

    // -------- GETCMD MENU LIB --------
    if (buttonId === 'getcmd_menu_lib') {
        const fs = await import('fs/promises');
        const libDir = path.join(process.cwd(), 'lib');

        const entries = await fs.readdir(libDir, { withFileTypes: true });
        const jsFiles = entries
            .filter(e => e.isFile() && e.name.endsWith('.js'))
            .map(e => e.name)
            .sort();

        if (jsFiles.length === 0) {
            await ctx.reply('📁 *lib/*\n\nTidak ada file.');
            await ctx.react('❌');
            return { stop: true };
        }

        const rows = jsFiles.map(file => ({
            title: `📄 ${file}`,
            rowId: `getcmd_lib_${file.replace('.js', '')}`,
            description: `File library ${file}`
        }));

        const sections = [];
        const maxRows = 10;
        for (let i = 0; i < rows.length; i += maxRows) {
            sections.push({
                title: `📁 File ${Math.floor(i / maxRows) + 1}`,
                rows: rows.slice(i, i + maxRows)
            });
        }

        await sock.sendMessage(jid, {
            text: '📌 *GETCMD - Pilih File*\n\nPilih file di lib/:',
            title: '📁 lib/',
            footer: `📱 Total: ${jsFiles.length} files`,
            buttonText: '📋 Buka Daftar',
            sections
        });

        await ctx.react('✅');
        return { stop: true };
    }

    // -------- GETCMD MENU SCRAPER --------
    if (buttonId === 'getcmd_menu_scraper') {
        const fs = await import('fs/promises');
        const scraperDir = path.join(process.cwd(), 'scraper');

        const entries = await fs.readdir(scraperDir, { withFileTypes: true });
        const jsFiles = entries
            .filter(e => e.isFile() && e.name.endsWith('.js'))
            .map(e => e.name)
            .sort();

        if (jsFiles.length === 0) {
            await ctx.reply('📁 *scraper/*\n\nTidak ada file.');
            await ctx.react('❌');
            return { stop: true };
        }

        const rows = jsFiles.map(file => ({
            title: `📄 ${file}`,
            rowId: `getcmd_scraper_${file.replace('.js', '')}`,
            description: `File scraper ${file}`
        }));

        const sections = [];
        const maxRows = 10;
        for (let i = 0; i < rows.length; i += maxRows) {
            sections.push({
                title: `📁 File ${Math.floor(i / maxRows) + 1}`,
                rows: rows.slice(i, i + maxRows)
            });
        }

        await sock.sendMessage(jid, {
            text: '📌 *GETCMD - Pilih File*\n\nPilih file scraper:',
            title: '📁 scraper/',
            footer: `📱 Total: ${jsFiles.length} files`,
            buttonText: '📋 Buka Daftar',
            sections
        });

        await ctx.react('✅');
        return { stop: true };
    }

    // -------- YT BUTTON (TANPA SESSION) --------
    if (buttonId.startsWith('yt_')) {
        const encoded = buttonId.replace('yt_', '');
        const data = decodeData(encoded);

        if (!data || !data.url) {
            await ctx.reply('❌ Data tidak valid. Silakan .yt ulang.');
            await ctx.react('❌');
            return { stop: true };
        }

        if (data.type === 'audio') {
            await sock.sendMessage(jid, {
                audio: { url: data.url },
                mimetype: 'audio/mpeg',
                fileName: `${data.title}.${data.ext || 'mp3'}`,
                contextInfo: {
                    mentionedJid: [sender],
                    isForwarded: true,
                    forwardingScore: 999
                }
            });
            await ctx.react('✅');
            return { stop: true };
        }

        try {
            const axios = (await import('axios')).default;
            const response = await axios.get(data.url, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const buffer = Buffer.from(response.data);
            const caption = `🎬 *${data.title}*\n⏱️ ${data.duration} | 📊 ${data.quality}`;

            await sock.sendMessage(jid, {
                document: buffer,
                fileName: `${data.title}.${data.ext || 'mp4'}`,
                mimetype: 'video/mp4',
                caption: caption + '\n\n📌 Dikirim sebagai dokumen',
                contextInfo: {
                    mentionedJid: [sender],
                    isForwarded: true,
                    forwardingScore: 999
                }
            });

            await ctx.react('✅');
        } catch (error) {
            await ctx.reply(`❌ Gagal download: ${error.message}`);
            await ctx.react('❌');
        }
        return { stop: true };
    }

    // -------- GETCMD OUTPUT (text_/file_) --------
    if (buttonId.startsWith('text_') || buttonId.startsWith('file_')) {
        const sessionId = buttonId.replace('text_', '').replace('file_', '');
        const session = global.getcmdSessions.get(sessionId);

        if (!session) {
            await ctx.reply('⏳ Session expired. Silakan .getcmd ulang.');
            return { stop: true };
        }

        const { source, fileName, relativePath, fileSize, totalLines } = session;

        if (buttonId.startsWith('text_')) {
            const maxChars = 3800;
            let text = `📄 *${relativePath}*\n📊 ${totalLines} lines\n📦 ${fileSize} KB\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            if (source.length > maxChars) {
                text += source.slice(0, maxChars - 200);
                text += `\n\n... (${source.length - maxChars + 200} karakter terpotong)`;
            } else {
                text += source;
            }
            await ctx.reply(text);
            await ctx.react('✅');
        } else {
            await sock.sendMessage(jid, {
                document: Buffer.from(source, 'utf8'),
                fileName,
                mimetype: 'text/javascript',
                caption: `📄 *${relativePath}*\n📊 ${totalLines} lines\n📦 ${fileSize} KB`
            });
            await ctx.react('✅');
        }
        return { stop: true };
    }

    return { stop: true };
}

// ============================================================
// AUTO VN
// ============================================================

async function handleAutoVn(ctx) {
    const { message, sock, chat } = ctx;
    const hasAudio = message?.message?.audioMessage
        || message?.message?.documentMessage
        || message?.message?.videoMessage;

    if (!hasAudio) return;

    try {
        const media = await import('./media.js');
        const mediaBuffer = await getMediaFromMessage(message, sock);

        if (mediaBuffer && mediaBuffer.length > 0) {
            const vnBuffer = await media.toVoiceNote(mediaBuffer);
            if (vnBuffer && vnBuffer.length > 0) {
                await sock.sendMessage(chat, {
                    audio: vnBuffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true
                });
            }
        }
    } catch {}
}

// ============================================================
// MEDIA HELPER
// ============================================================

async function getMediaFromMessage(message, sock) {
    try {
        const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
        const content = message?.message || {};
        let contextInfo = null;

        for (const value of Object.values(content)) {
            if (value && typeof value === 'object' && value.contextInfo) {
                contextInfo = value.contextInfo;
                break;
            }
        }

        if (contextInfo?.quotedMessage) {
            const quotedMsgObj = {
                key: {
                    remoteJid: message.key.remoteJid,
                    id: contextInfo.stanzaId,
                    participant: contextInfo.participant || message.key.participant
                },
                message: contextInfo.quotedMessage
            };
            try {
                const buffer = await downloadMediaMessage(
                    quotedMsgObj,
                    'buffer',
                    {},
                    { logger: console, reuploadRequest: sock.updateMediaMessage }
                );
                if (buffer?.length > 0) return buffer;
            } catch {}
        }

        const msgTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
        if (msgTypes.some(t => content[t])) {
            try {
                const buffer = await downloadMediaMessage(
                    message,
                    'buffer',
                    {},
                    { logger: console, reuploadRequest: sock.updateMediaMessage }
                );
                if (buffer?.length > 0) return buffer;
            } catch {}
        }

        return null;
    } catch {
        return null;
    }
}

// ============================================================
// INTERACTIVE RESPONSE HANDLER (native flow single_select)
// ============================================================

async function handleInteractiveResponse(message, ctx, sock) {
    const interactive = message?.message?.interactiveResponseMessage;
    if (!interactive) return { stop: true };

    let rowId = '';
    const nativeFlow = interactive?.nativeFlowResponseMessage;

    if (nativeFlow?.paramsJson) {
        try {
            const params = JSON.parse(nativeFlow.paramsJson);
            rowId = params.id || params.selectedId || params.selectedRowId || '';
        } catch (e) {
            console.log('[INTERACTIVE] Parse error:', e.message);
        }
    }

    if (!rowId) {
        console.log('[INTERACTIVE] No rowId found');
        return { stop: true };
    }

    console.log(`[INTERACTIVE] rowId: ${rowId} | sender: ${ctx.sender}`);

    let cmdName = rowId;
    if (!cmdName.startsWith('.') && !cmdName.startsWith('!') && !cmdName.startsWith('#')) {
        cmdName = '.' + cmdName;
    }

    if (!applyParsed(ctx, cmdName)) {
        await ctx.reply(`❌ Plugins tidak dikenali: ${cmdName}`);
        await ctx.react('❌');
        return { stop: true };
    }

    return { stop: false };
}

// ============================================================
// EXPORT
// ============================================================

export default {
    handleListResponse,
    handleButtonResponse,
    handleInteractiveResponse,
    handleAutoVn,
    getMediaFromMessage
};