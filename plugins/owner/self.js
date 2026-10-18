// command/owner/self.js

import settings from '../../lib/settings.js';

export default {
    name: 'self',
    aliases: [],
    category: 'owner',
    description: 'Set bot to self mode',
    ownerOnly: true,

    async execute(ctx) {
        await ctx.react('⏳');
        
        const currentMode = settings.getValue('mode');
        if (currentMode === 'self') {
            await ctx.react('✅');
            return '🔐 Bot *sudah* dalam mode SELF.';
        }

        settings.set('mode', 'self');
        await ctx.react('✅');
        return '🔐 Bot sekarang dalam mode *SELF*.\nHanya Owner yang dapat menggunakan bot.';
    }
};