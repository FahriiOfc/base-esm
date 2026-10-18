// lib/identity.js
// FarrMdV2 - Identity & Permission Resolver (UNIFIED)
// Semua pengecekan: isOwner, isPremium, isCreator, isBot, isAdmin, isBotAdmin
// Semua resolusi: JID, LID, PN, quoted sender/chat

import config from '../config.js';
import ownerManager from './ownerManager.js';
import premiumManager from './premium.js';

// ============================================================
// NORMALIZE JID (PUBLIC FUNCTION)
// ============================================================

export function normalizeJid(jid) {
    if (!jid) return '';
    return String(jid).trim().replace(/:\d+(?=@)/, '');
}

// ============================================================
// HELPER: PATH AMBIL MESSAGE CONTENT
// ============================================================

function getContextInfo(message) {
    const content = message?.message || {};
    for (const value of Object.values(content)) {
        if (value && typeof value === 'object' && value.contextInfo) {
            return value.contextInfo;
        }
    }
    return null;
}

function getMessageText(message) {
    const msg = message?.message;
    if (!msg) return '';
    return (
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.documentMessage?.caption ||
        ''
    ).trim();
}

function extractNumber(jid) {
    const normalized = normalizeJid(jid);
    if (!normalized) return '';
    const parts = normalized.split('@');
    return String(parts[0] || '').replace(/\D/g, '').replace(/^0+/, '');
}

function getJidType(jid) {
    const normalized = normalizeJid(jid);
    if (!normalized) return 'unknown';
    if (normalized.endsWith('@lid')) return 'lid';
    if (normalized.endsWith('@s.whatsapp.net')) return 'pn';
    if (normalized.endsWith('@g.us')) return 'group';
    return 'unknown';
}

function getSenderFromKey(key) {
    if (!key) return '';
    let sender = '';
    if (key.remoteJid && key.remoteJid.endsWith('@g.us')) {
        sender = key.participantAlt || key.participant || '';
    } else {
        sender = key.remoteJidAlt || key.remoteJid || '';
    }
    return normalizeJid(sender);
}

// ============================================================
// IDENTITY RESOLVER (UNIFIED CLASS)
// ============================================================

export class IdentityResolver {
    #ownerNumber = null;
    #botJid = null;

    constructor() {
        this.#ownerNumber = this.#normalizeNumber(config.ownerNumber || '');
    }

    // ============================================================
    // SET / GET BOT JID
    // ============================================================

    setBotJid(botJid) {
        this.#botJid = normalizeJid(botJid);
    }

    getBotJid() {
        return this.#botJid;
    }

    getOwnerNumber() {
        return this.#ownerNumber;
    }

    // ============================================================
    // NORMALIZATION HELPERS
    // ============================================================

    normalizeJid(jid) {
        return normalizeJid(jid);
    }

    #normalizeNumber(number) {
        if (!number) return '';
        return String(number).replace(/\D/g, '').replace(/^0+/, '');
    }

    // ============================================================
    // ROLE CHECKS (SYNC)
    // ============================================================

    isOwnerSync(jid) {
        const cleaned = String(jid || '').replace(/\D/g, '');
        if (!cleaned) return false;

        if (ownerManager.isOwner(cleaned)) return true;
        if (cleaned === this.#ownerNumber) return true;
        if (this.#botJid && cleaned === this.#normalizeNumber(this.#botJid)) return true;

        return false;
    }

    isPremium(jid) {
        const cleaned = String(jid || '').replace(/\D/g, '');
        if (!cleaned) return false;
        if (this.isOwnerSync(cleaned)) return true;
        return premiumManager.isPremium(cleaned);
    }

    isCreator(jid) {
        const cleaned = String(jid || '').replace(/\D/g, '');
        if (!cleaned) return false;
        const creators = (config.creator || []).map(c => this.#normalizeNumber(c));
        return creators.includes(cleaned);
    }

    isBot(jid) {
        const normalized = normalizeJid(jid);
        if (!normalized || !this.#botJid) return false;
        if (normalized === this.#botJid) return true;
        return extractNumber(normalized) === extractNumber(this.#botJid);
    }

    // ============================================================
    // LID ↔ PN MAPPING (via mappingCache)
    // ============================================================

    async #lidToPn(lid, sock) {
        try {
            const cache = sock?.signalRepository?.lidMapping?.mappingCache;
            if (!cache?.get) return null;

            const bare = String(lid).replace(/@lid$/, '').replace(/:\d+$/, '');
            const pn = cache.get(`lid:${bare}`);
            if (!pn) return null;

            const pnStr = String(pn);
            return normalizeJid(pnStr.includes('@') ? pnStr : `${pnStr}@s.whatsapp.net`);
        } catch {}
        return null;
    }

    async #pnToLid(pn, sock) {
        try {
            const cache = sock?.signalRepository?.lidMapping?.mappingCache;
            if (!cache?.get) return null;

            const bare = String(pn).replace(/@s\.whatsapp\.net$/, '').replace(/:\d+$/, '');
            const lid = cache.get(`pn:${bare}`);
            if (!lid) return null;

            const lidStr = String(lid);
            return normalizeJid(lidStr.includes('@') ? lidStr : `${lidStr}@lid`);
        } catch {}
        return null;
    }

    // ============================================================
    // PARTICIPANT LOOKUP (CREATOR STYLE — PRIORITY METHOD)
    // ============================================================

    findParticipant(metadata, jid) {
        if (!metadata || !Array.isArray(metadata.participants)) return null;
        const target = normalizeJid(jid);
        if (!target) return null;

        // Direct match
        const direct = metadata.participants.find(p => {
            const candidates = [p?.id, p?.jid, p?.lid, p?.phoneNumber]
                .map(v => normalizeJid(v))
                .filter(Boolean);
            return candidates.includes(target);
        });
        if (direct) return direct;

        // Match by number
        const targetNumber = extractNumber(target);
        if (!targetNumber) return null;

        return metadata.participants.find(p => {
            const candidates = [p?.phoneNumber, p?.id, p?.jid, p?.lid];
            return candidates.some(v => extractNumber(v) === targetNumber);
        }) || null;
    }

    // ============================================================
    // RESOLVE SINGLE JID → { jid, pn, lid, type, ... }
    // ============================================================

    async resolve(jid, sock, { metadata = null, isGroup = false } = {}) {
        const normalized = normalizeJid(jid);
        if (!normalized) {
            return { jid: '', type: 'unknown', pn: null, lid: null, isResolved: false };
        }

        const type = getJidType(normalized);
        const number = extractNumber(normalized);

        const resolved = {
            jid: normalized,
            type,
            number,
            pn: null,
            lid: null,
            isResolved: false
        };

        // PRIORITY 1: participants.find() dari metadata (creator style)
        if (isGroup && metadata?.participants) {
            const p = this.findParticipant(metadata, normalized);
            if (p) {
                if (type === 'lid' && p.id) {
                    resolved.pn = normalizeJid(p.id);
                    resolved.lid = normalized;
                    resolved.isResolved = true;
                } else if (type === 'pn' && p.lid) {
                    resolved.lid = normalizeJid(p.lid);
                    resolved.pn = normalized;
                    resolved.isResolved = true;
                }
            }
        }

        // PRIORITY 2: fallback ke signalRepository
        if (!resolved.isResolved && sock) {
            if (type === 'pn') {
                const lid = await this.#pnToLid(normalized, sock);
                if (lid) {
                    resolved.lid = lid;
                    resolved.isResolved = true;
                }
            } else if (type === 'lid') {
                const pn = await this.#lidToPn(normalized, sock);
                if (pn) {
                    resolved.pn = pn;
                    resolved.isResolved = true;
                }
            }
        }

        return resolved;
    }

    // ============================================================
    // RESOLVE ALL (SENDER + QUOTED) UNTUK SERIALIZER
    // ============================================================

    async resolveAll(message, sock, metadata = null, isGroup = false) {
        const key = message?.key || {};
        const chatRaw = normalizeJid(key.remoteJid);
        const senderRaw = getSenderFromKey(key);

        // Resolve sender
        const senderResolved = await this.resolve(senderRaw, sock, { metadata, isGroup });

        // Resolve chat (kalau DM & @lid)
        let chatResolved = { jid: chatRaw, pn: null, lid: null, type: getJidType(chatRaw), isResolved: false };
        if (chatRaw.endsWith('@lid') && !isGroup) {
            chatResolved = await this.resolve(chatRaw, sock, { metadata, isGroup });
        }

        // Resolve quoted sender & chat (kalau ada)
        const contextInfo = getContextInfo(message);
        let quotedInfo = null;

        if (contextInfo?.quotedMessage) {
            const quotedSenderRaw = normalizeJid(contextInfo.participant || '');
            const quotedChatRaw = normalizeJid(contextInfo.remoteJid || chatRaw);

            const quotedSender = quotedSenderRaw
                ? await this.resolve(quotedSenderRaw, sock, { metadata, isGroup })
                : null;

            let quotedChat = { jid: quotedChatRaw };
            if (quotedChatRaw.endsWith('@lid') && !isGroup) {
                quotedChat = await this.resolve(quotedChatRaw, sock, { metadata, isGroup });
            }

            quotedInfo = {
                sender: quotedSender,
                chat: quotedChat,
                message: contextInfo.quotedMessage,
                stanzaId: contextInfo.stanzaId,
                text: getMessageText({ message: contextInfo.quotedMessage })
            };
        }

        return {
            sender: senderResolved,
            chat: chatResolved,
            quoted: quotedInfo
        };
    }

    // ============================================================
    // ADMIN CHECK
    // ============================================================

    isAdmin(metadata, jid) {
        const p = this.findParticipant(metadata, jid);
        if (!p) return false;
        return p.admin === 'admin' || p.admin === 'superadmin';
    }

    isBotAdmin(metadata, sock) {
        const botJid = normalizeJid(sock?.user?.id || '');
        if (!botJid) return false;
        return this.isAdmin(metadata, botJid);
    }

    // ============================================================
    // ASYNC OWNER CHECK (untuk kompatibilitas lama)
    // ============================================================

    async isOwner(jid, sock) {
        const cleaned = String(jid || '').replace(/\D/g, '');
        if (this.isOwnerSync(cleaned)) return true;
        if (!sock) return false;

        const resolved = await this.resolve(jid, sock);
        const pnNumber = resolved.pn ? extractNumber(resolved.pn) : '';
        const lidNumber = resolved.lid ? extractNumber(resolved.lid) : '';
        const number = extractNumber(jid);

        return (
            this.isOwnerSync(pnNumber) ||
            this.isOwnerSync(lidNumber) ||
            this.isOwnerSync(number)
        );
    }

    // ============================================================
    // RESOLVE TARGET (untuk command seperti .kick, .promote)
    // ============================================================

    resolveTarget(message) {
        const contextInfo = getContextInfo(message);
        if (!contextInfo) return null;

        let target = null;
        if (Array.isArray(contextInfo.mentionedJid) && contextInfo.mentionedJid.length) {
            target = contextInfo.mentionedJid[0];
        }
        if (!target && contextInfo.participant) {
            target = contextInfo.participant;
        }
        if (!target) return null;

        target = normalizeJid(target);
        if (!target.includes('@')) {
            const cleanNumber = target.replace(/\D/g, '');
            if (cleanNumber.length >= 10) {
                target = cleanNumber + '@s.whatsapp.net';
            }
        }
        return target;
    }

    // ============================================================
    // CHECK COMMAND PERMISSIONS (dari permissions.js lama)
    // ============================================================

    async checkCommandPermissions(ctx, command) {
        const { isGroup, isOwner, isAdmin, isBotAdmin, fromMe, sender } = ctx;

        if (command.premiumOnly && !isOwner && !fromMe) {
            if (!this.isPremium(sender)) {
                return {
                    allowed: false,
                    reason: '❌ Fitur ini khusus Premium. Ketik .checkprem untuk cek status.'
                };
            }
        }

        if (command.ownerOnly && !isOwner && !fromMe) {
            return { allowed: false, reason: '❌ Command ini hanya untuk Owner.' };
        }

        if (fromMe) return { allowed: true };

        if (command.adminOnly && !isOwner) {
            if (!isGroup) return { allowed: false, reason: '❌ Command ini hanya dapat digunakan di grup.' };
            if (!isAdmin) return { allowed: false, reason: '❌ Hanya admin grup yang dapat menggunakan command ini.' };
        }

        if (command.botAdmin && !isOwner) {
            if (!isGroup) return { allowed: false, reason: '❌ Command ini hanya dapat digunakan di grup.' };
            if (!isBotAdmin) return { allowed: false, reason: '❌ Bot harus menjadi admin terlebih dahulu.' };
        }

        if (command.groupOnly && !isGroup) {
            return { allowed: false, reason: '❌ Command ini hanya dapat digunakan di grup.' };
        }

        return { allowed: true };
    }

    // ============================================================
    // GET GROUP METADATA
    // ============================================================

    async getGroupMetadata(sock, jid) {
        if (!sock || !jid || !jid.endsWith('@g.us')) return null;
        try {
            return await sock.groupMetadata(jid);
        } catch {
            return null;
        }
    }
}

export default new IdentityResolver();