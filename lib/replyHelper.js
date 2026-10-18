// lib/replyHelper.js
// 📨 Helper untuk reply + forwarded

/**
 * Buat contextInfo untuk reply + forwarded
 * @param {Object} message - Pesan asli dari user
 * @param {Object} sock - Socket Baileys
 * @param {Array} mentionedJid - JID yang ingin di-mention
 * @returns {Object} contextInfo
 */
export function createReplyContext(message, sock, mentionedJid = []) {
    const quotedMsg = message.message || {};
    const key = message.key || {};

    return {
        quotedMessage: quotedMsg,
        stanzaId: key.id,
        participant: key.participant || key.remoteJid,
        remoteJid: key.remoteJid,
        isForwarded: true,
        forwardingScore: 999,
        mentionedJid: mentionedJid,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363311536505691@newsletter',
            newsletterName: 'FarrMdV1 Bot',
            serverMessageId: -1
        }
    };
}

/**
 * Kirim pesan dengan reply + forwarded otomatis
 * @param {Object} sock - Socket Baileys
 * @param {String} jid - JID tujuan
 * @param {Object} content - Isi pesan ({ text, image, video, dll })
 * @param {Object} message - Pesan asli dari user
 * @param {Array} mentionedJid - JID yang ingin di-mention
 * @returns {Promise}
 */
export async function sendWithReply(sock, jid, content, message, mentionedJid = []) {
    const contextInfo = createReplyContext(message, sock, mentionedJid);
    
    return sock.sendMessage(jid, {
        ...content,
        contextInfo: contextInfo
    });
}

export default {
    createReplyContext,
    sendWithReply
};