// lib/helper.js
// FarrMdV2 - Feature Helpers
// List response, button response, autoVN, media

import serializer from './serializer.js';
import config from '../config.js';

// ============================================================
// HELPERS
// ============================================================

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

    // -------- COMMAND LAINNYA --------
    let cmdName = buttonId;
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
