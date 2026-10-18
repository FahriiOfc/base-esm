// command/group/add.js

import { normalizeJid } from '../../lib/identity.js';

export default {
    name: 'add',
    aliases: ['invite'],
    category: 'group',
    description: 'Add member to group',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,

    async execute(ctx) {
        const { sock, chat, args, quoted } = ctx;

        await ctx.react('⏳');

        // ============================================================
        // 1. DAPATKAN TARGET
        // ============================================================

        let targets = [];

        // Cek dari quoted message (reply ke kontak)
        if (quoted) {
            // Jika quoted adalah kontak
            if (quoted.message?.contactMessage) {
                const contact = quoted.message.contactMessage;
                const waid = contact.waid || contact.phoneNumber;
                if (waid) {
                    targets.push(waid + '@s.whatsapp.net');
                }
            }
            
            // Jika quoted adalah pesan teks yang berisi nomor
            if (quoted.text) {
                const numbers = quoted.text.match(/\d{10,15}/g);
                if (numbers) {
                    for (const num of numbers) {
                        const clean = num.replace(/\D/g, '');
                        if (clean.length >= 10) {
                            targets.push(clean + '@s.whatsapp.net');
                        }
                    }
                }
            }
        }

        // Cek dari argumen
        if (args.length > 0) {
            const input = args.join(' ');
            // Cari semua nomor di argumen
            const numbers = input.match(/\d{10,15}/g);
            if (numbers) {
                for (const num of numbers) {
                    const clean = num.replace(/\D/g, '');
                    if (clean.length >= 10) {
                        const jid = clean + '@s.whatsapp.net';
                        if (!targets.includes(jid)) {
                            targets.push(jid);
                        }
                    }
                }
            }
        }

        // Jika tidak ada target
        if (targets.length === 0) {
            await ctx.react('❌');
            return (
                '❌ Tidak ada nomor yang valid!\n\n' +
                '📌 *Cara:*\n' +
                '1. Ketik nomor: `.add 628123456789`\n' +
                '2. Banyak nomor: `.add 628111 628222`\n' +
                '3. Reply ke kontak: `.add` (reply ke kontak WhatsApp)\n' +
                '4. Reply ke pesan berisi nomor: `.add`'
            );
        }

        // ============================================================
        // 2. VALIDASI
        // ============================================================

        const botJid = sock?.user?.id || '';
        const validTargets = targets.filter(t => {
            const normalized = normalizeJid(t);
            // Skip bot sendiri
            if (normalized === normalizeJid(botJid)) return false;
            // Skip yang sudah di grup
            const isAlready = ctx.metadata?.participants?.some(p => 
                normalizeJid(p.id) === normalized || normalizeJid(p.jid) === normalized
            );
            return !isAlready;
        });

        if (validTargets.length === 0) {
            await ctx.react('❌');
            return '❌ Semua nomor sudah ada di grup atau tidak valid.';
        }

        // ============================================================
        // 3. ADD
        // ============================================================

        try {
            const result = await sock.groupParticipantsUpdate(chat, validTargets, 'add');
            
            let success = 0;
            let failed = 0;
            let failedNumbers = [];

            if (Array.isArray(result)) {
                for (const item of result) {
                    if (String(item?.status || '') === '200') {
                        success++;
                    } else {
                        failed++;
                        const jid = item?.jid || 'unknown';
                        failedNumbers.push(jid.split('@')[0]);
                    }
                }
            }

            await ctx.react('✅');

            let msg = `➕ *ADD MEMBER*\n\n✅ Berhasil: ${success}\n❌ Gagal: ${failed}`;
            if (failedNumbers.length > 0) {
                msg += `\n\n❌ Gagal untuk: ${failedNumbers.join(', ')}`;
                msg += `\n💡 Pastikan nomor terdaftar di WhatsApp.`;
            }

            return msg;

        } catch (error) {
            console.error('[ADD] Error:', error.message);
            await ctx.react('❌');
            return `❌ Gagal menambahkan member: ${error.message}`;
        }
    }
};