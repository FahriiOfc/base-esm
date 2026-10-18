// command/main/owner.js

import config from '../../config.js';
import ownerManager from '../../lib/ownerManager.js';

export default {
    name: 'owner',
    aliases: ['creator', 'pembuat'],
    category: 'main',
    description: '👑 Show bot owner contact(s)',

    async execute(ctx) {
        const { sock, chat, sender } = ctx;
        await ctx.react('⏳');

        let owners = ownerManager.getOwners();
        
        // FALLBACK: kalau database kosong, pakai config.ownerNumber
        if (!owners || owners.length === 0) {
            const fallback = String(config.ownerNumber || '').replace(/\D/g, '');
            if (fallback) {
                owners = [fallback];
            }
        }

        if (!owners || owners.length === 0) {
            await ctx.react('❌');
            return '❌ Tidak ada owner terdaftar. Hubungi admin.';
        }

        const botName = config.botName || 'FarrMdV1';

        // ============================================================
        // GENERATE MULTIPLE VCARD
        // ============================================================

        const contacts = owners.map((number, index) => {
            let displayName;
            if (owners.length === 1) {
                displayName = `${botName} - Owner`;
            } else if (index === 0) {
                displayName = `${botName} - Owner (Primary)`;
            } else {
                displayName = `${botName} - Owner ${index + 1}`;
            }
            
            return {
                vcard: `BEGIN:VCARD
VERSION:3.0
FN:${displayName}
N:${displayName};;;;
TEL;type=CELL;type=VOICE;waid=${number}:+${number}
END:VCARD`
            };
        });

        // ============================================================
        // KIRIM KONTAK
        // ============================================================

        await sock.sendMessage(chat, {
            contacts: {
                displayName: `${botName} - Contact (${owners.length} Owner${owners.length > 1 ? 's' : ''})`,
                contacts: contacts
            },
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                mentionedJid: [sender]
            }
        });

        await ctx.react('✅');
        return;
    }
};