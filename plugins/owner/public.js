// command/owner/public.js

import settings from '../../lib/settings.js';

export default {
    name: 'public',
    aliases: [],
    category: 'owner',
    description: 'Set bot to public mode',
    ownerOnly: true,

    async execute(ctx) {
        await ctx.react('⏳');
        
        const currentMode = settings.getValue('mode');
        if (currentMode === 'public') {
            await ctx.react('✅');
            return '🌐 Bot *sudah* dalam mode PUBLIC.';
        }

        settings.set('mode', 'public');
        await ctx.react('✅');
        return '🌐 Bot sekarang dalam mode *PUBLIC*.\nSemua pengguna dapat menggunakan bot.';
    }
};