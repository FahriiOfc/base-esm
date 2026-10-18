// lib/serializer.js
// FarrMdV2 - Message Serializer
// Normalize Baileys messages → Context (ctx)
// Semua pengecekan identitas & permission lewat identity.js

import identity from './identity.js';

export class Serializer {
    async serialize(message, sock) {
        if (!message || !message.key) throw new Error('Invalid message');

        const jid = message.key.remoteJid;
        if (!jid) throw new Error('No remote JID');

        const isGroup = jid.endsWith('@g.us');
        const fromMe = message.key.fromMe === true;

        // ---------- GROUP METADATA (dulu, butuh untuk resolve) ----------
        let metadata = null;
        if (isGroup) {
            metadata = await identity.getGroupMetadata(sock, jid);
        }

        // ---------- RESOLVE ALL (sender + chat + quoted) ----------
        const resolved = await identity.resolveAll(message, sock, metadata, isGroup);

        // ---------- FIX SENDER LID ----------
        // WA gak isi participantAlt untuk pesan dari device sendiri (LID addressing).
        // Kalau fromMe=true & sender masih @lid → pakai PN bot sendiri.
        let sender = resolved.sender.pn || resolved.sender.jid;

        if (fromMe && sender.endsWith('@lid') && sock?.user?.id) {
            sender = identity.normalizeJid(sock.user.id);
        }

        const chat = resolved.chat.jid;

        // ---------- ROLE CHECKS ----------
        const isOwner = identity.isOwnerSync(sender);
        const isPremium = identity.isPremium(sender);
        const isCreator = identity.isCreator(sender);
        const isBot = identity.isBot(sender);

        let isAdmin = false;
        let isBotAdmin = false;
        if (isGroup && metadata) {
            isAdmin = identity.isAdmin(metadata, sender);
            isBotAdmin = identity.isBotAdmin(metadata, sock);
        }

        // ---------- QUOTED ----------
        let quoted = null;
        if (resolved.quoted) {
            let quotedSender = resolved.quoted.sender?.pn || resolved.quoted.sender?.jid || sender;

            // FIX: quoted sender masih @lid → resolve via mappingCache
            if (quotedSender.endsWith('@lid')) {
                const cache = sock?.signalRepository?.lidMapping?.mappingCache;
                if (cache?.get) {
                    const bare = quotedSender.replace(/@lid$/, '').replace(/:\d+$/, '');
                    const pn = cache.get(`lid:${bare}`);
                    if (pn) {
                        const pnStr = String(pn);
                        quotedSender = identity.normalizeJid(pnStr.includes('@') ? pnStr : `${pnStr}@s.whatsapp.net`);
                    }
                }
            }

            quoted = {
                key: {
                    remoteJid: resolved.quoted.chat?.jid || chat,
                    id: resolved.quoted.stanzaId,
                    participant: resolved.quoted.sender?.jid || sender
                },
                message: resolved.quoted.message,
                sender: quotedSender,
                text: resolved.quoted.text
            };
        }

        // ---------- MESSAGE CONTENT ----------
        const msg = message.message || {};
        const text = (
            msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption ||
            msg.videoMessage?.caption ||
            msg.documentMessage?.caption ||
            ''
        ).trim();

        const messageKey = message.key;
        const messageId = messageKey.id;

        // ---------- CONTEXT INFO ----------
        let contextInfo = null;
        for (const value of Object.values(msg)) {
            if (value && typeof value === 'object' && value.contextInfo) {
                contextInfo = value.contextInfo;
                break;
            }
        }
        const mentionedJid = contextInfo?.mentionedJid || [];

        // ---------- BUILD CTX ----------
        const ctx = {
            // Raw
            sock,
            message,
            messageKey,
            messageId,

            // Identities
            chat,
            sender,
            pushName: message.pushName || 'User',
            isGroup,
            fromMe,

            // Resolution
            senderResolved: resolved.sender,
            chatResolved: resolved.chat,

            // Roles
            isOwner,
            isPremium,
            isCreator,
            isBot,
            isAdmin,
            isBotAdmin,

            // Metadata
            metadata,

            // Content
            text,
            args: [],
            command: null,
            commandName: null,

            // Quoted
            quoted,
            quotedMessage: quoted?.message || null,

            // Mentions
            mentionedJid,

            // Command loader ref
            commandLoader: global.commandLoader || null,

            // Helpers
            reply: async (text, options = {}) => {
                return sock.sendMessage(chat, { text: String(text), ...options });
            },
            send: async (content, options = {}) => {
                return sock.sendMessage(chat, content, options);
            },
            react: async (emoji) => {
                try {
                    await sock.sendMessage(chat, { react: { text: emoji, key: messageKey } });
                } catch {}
            },
            delete: async (targetKey) => {
                try {
                    await sock.sendMessage(chat, { delete: targetKey || messageKey });
                } catch {}
            },

            resolveTarget: () => identity.resolveTarget(message),

            identity,
            getMediaFromMessage: null
        };

        return ctx;
    }

    // ============================================================
    // PARSE COMMAND
    // ============================================================

    parseCommand(text, prefixes) {
        if (!text) return null;

        const prefixList = Array.isArray(prefixes) ? prefixes : [prefixes || '.'];
        const prefix = prefixList.find(v => text.startsWith(v));

        if (!prefix) return null;

        const body = text.slice(prefix.length).trim();
        if (!body) return null;

        const split = body.split(/\s+/);
        const command = split.shift().toLowerCase();

        return {
            prefix,
            command,
            args: split,
            text: split.join(' ')
        };
    }
}

export default new Serializer();