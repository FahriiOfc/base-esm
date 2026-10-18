// command/group/kick.js

import { normalizeJid } from '../../lib/identity.js';

export default {
    name: 'kick',
    aliases: ['remove'],
    category: 'group',
    description: 'Remove member from group',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,

    async execute(ctx) {
        const { sock, chat, sender, args, quoted } = ctx;

        await ctx.react('⏳');

        // ============================================================
        // 1. DAPATKAN TARGET
        // ============================================================

        let target = ctx.resolveTarget();

        // Jika tidak ada target dari reply/tag, coba dari argumen
        if (!target) {
            const rawInput = args.join(' ').trim();
            
            // Cek apakah ada mention di teks
            const mentionMatch = rawInput.match(/@(\d+)/);
            if (mentionMatch) {
                target = mentionMatch[1] + '@s.whatsapp.net';
            }
            
            // Cek apakah nomor
            if (!target) {
                const cleanNumber = rawInput.replace(/\D/g, '');
                if (cleanNumber.length >= 10) {
                    target = cleanNumber + '@s.whatsapp.net';
                }
            }
        }

        // Jika masih tidak ada, coba dari quoted message
        if (!target && quoted) {
            target = quoted.sender || quoted.key?.participant;
        }

        if (!target) {
            await ctx.react('❌');
            return (
                '❌ Target tidak valid!\n\n' +
                '📌 *Cara:*\n' +
                '1. Reply pesan user: `.kick`\n' +
                '2. Tag user: `.kick @user`\n' +
                '3. Ketik nomor: `.kick 628123456789`'
            );
        }

        // Normalisasi JID
        target = normalizeJid(target);

        // ============================================================
        // 2. VALIDASI
        // ============================================================

        const botJid = sock?.user?.id || '';
        if (target === normalizeJid(botJid)) {
            await ctx.react('❌');
            return '❌ Tidak bisa mengeluarkan bot sendiri.';
        }

        // Cek apakah target owner
        const isTargetOwner = await ctx.identity?.isOwner(target, sock) || false;
        if (isTargetOwner) {
            await ctx.react('❌');
            return '❌ Tidak bisa mengeluarkan owner bot.';
        }

        // Cek apakah target ada di grup
        const isParticipant = ctx.metadata?.participants?.some(p => 
            normalizeJid(p.id) === target || normalizeJid(p.jid) === target
        );

        if (!isParticipant) {
            await ctx.react('❌');
            return `❌ @${target.split('@')[0]} tidak ada di grup ini.`;
        }

        // ============================================================
        // 3. KICK
        // ============================================================

        try {
            await sock.groupParticipantsUpdate(chat, [target], 'remove');
            
            await ctx.react('✅');
            return `🦶 @${target.split('@')[0]} telah dikeluarkan dari grup.`;

        } catch (error) {
            console.error('[KICK] Error:', error.message);
            await ctx.react('❌');
            return `❌ Gagal mengeluarkan member: ${error.message}`;
        }
    }
};