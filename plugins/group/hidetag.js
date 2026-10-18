// command/group/hidetag.js

export default {
    name: 'hidetag',
    aliases: ['ht', 'h'],
    category: 'group',
    description: 'Send message with hidden tag all',
    groupOnly: true,
    adminOnly: true,
    botAdmin: false,

    async execute(ctx) {
        const { metadata, text, sock, chat } = ctx;
        
        await ctx.react('⏳');

        const participants = metadata?.participants || [];
        const mentions = participants
            .map(p => p.id || p.jid || p.lid)
            .filter(Boolean);

        const message = text || '📢 Hidetag';

        if (mentions.length === 0) {
            await ctx.react('❌');
            return '❌ Tidak ada member di grup ini.';
        }

        // Kirim pesan dengan mentions
        await sock.sendMessage(chat, {
            text: message,
            mentions: mentions
        });

        await ctx.react('✅');
        
        // Tidak perlu return karena sudah dikirim
        return;
    }
};