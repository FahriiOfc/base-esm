// command/group/tagall.js

export default {
    name: 'tagall',
    aliases: [],
    category: 'group',
    description: 'Tag all group members',
    groupOnly: true,
    adminOnly: true,
    botAdmin: false,

    async execute(ctx) {
        const { metadata, sock, chat } = ctx;

        await ctx.react('⏳');

        const participants = metadata?.participants || [];
        const mentions = participants
            .map(p => p.id || p.jid || p.lid)
            .filter(Boolean);

        if (mentions.length === 0) {
            await ctx.react('❌');
            return '❌ Tidak ada member di grup ini.';
        }

        const body = mentions.map(user => `@${user.split('@')[0]}`).join('\n');

        await sock.sendMessage(chat, {
            text: `📢 *TAG ALL*\n\n${body}`,
            mentions: mentions
        });

        await ctx.react('✅');
        return;
    }
};