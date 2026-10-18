// command/main/runtime.js

export default {
    name: 'runtime',
    aliases: ['uptime'],
    category: 'main',
    description: 'Show bot runtime',

    async execute(ctx) {
        await ctx.react('⏳');
        
        const seconds = process.uptime();
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        let runtime = '';
        if (days) runtime += `${days}d `;
        if (hours) runtime += `${hours}h `;
        if (minutes) runtime += `${minutes}m `;
        runtime += `${secs}s`;

        await ctx.reply(`⏱️ *Bot Runtime*\n\n${runtime}`);
        await ctx.react('✅');
    }
};