// command/group/promote.js

export default {
    name: 'promote',
    aliases: [],
    category: 'group',
    description: 'Promote member to admin',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,

    async execute(ctx) {
        const { sock, chat, metadata } = ctx;
        const target = ctx.resolveTarget();

        if (!target) {
            return '❌ Reply atau tag member yang ingin dipromote.';
        }

        const isTargetAdmin = ctx.identity?.isAdmin(metadata, target) || false;
        if (isTargetAdmin) {
            return `ℹ️ @${target.split('@')[0]} *sudah* menjadi admin.`;
        }

        await sock.groupParticipantsUpdate(chat, [target], 'promote');
        return `⬆️ @${target.split('@')[0]} sekarang menjadi admin.`;
    }
};