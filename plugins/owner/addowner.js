// command/owner/addowner.js

import ownerManager from '../../lib/ownerManager.js';

export default {
    name: 'addowner',
    aliases: ['addown'],
    category: 'owner',
    description: '➕ Add new owner number',
    ownerOnly: true,

    async execute(ctx) {
        const { args, reply } = ctx;
        await ctx.react('⏳');

        if (!args || args.length === 0) {
            await ctx.react('❌');
            return (
                '❌ *Cara Penggunaan:*\n\n' +
                `.addowner <nomor>\n\n` +
                '📌 *Contoh:*\n' +
                `.addowner 628123456789`
            );
        }

        const rawNumber = args[0];
        const result = ownerManager.addOwner(rawNumber);

        await ctx.react(result.success ? '✅' : '❌');
        return result.message;
    }
};