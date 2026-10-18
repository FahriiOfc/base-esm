// command/group/demote.js

export default {
    name: 'demote',
    aliases: [],
    category: 'group',
    description: 'Demote admin to member',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,

    async execute(ctx) {
        const { sock, chat, metadata } = ctx;
        const target = ctx.resolveTarget();

        if (!target) {
            return '❌ Reply atau tag admin yang ingin didemote.';
        }

        const isTargetAdmin = ctx.identity?.isAdmin(metadata, target) || false;
        if (!isTargetAdmin) {
            return `ℹ️ @${target.split('@')[0]} *bukan* admin.`;
        }

        await sock.groupParticipantsUpdate(chat, [target], 'demote');
        return `⬇️ @${target.split('@')[0]} bukan admin lagi.`;
    }
};