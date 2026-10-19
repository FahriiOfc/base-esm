// command/vps/uptime.js
// ⏱️ Uptime VPS & bot

import os from 'os';

export default {
    name: 'uptime',
    aliases: ['up'],
    category: 'vps',
    description: '⏱️ Show uptime VPS & bot',
    ownerOnly: true,

    async execute(ctx) {
        const { reply, react } = ctx;
        await react('⏳');

        function formatUptime(seconds) {
            const days = Math.floor(seconds / 86400);
            seconds %= 86400;
            const hours = Math.floor(seconds / 3600);
            seconds %= 3600;
            const minutes = Math.floor(seconds / 60);
            seconds = Math.floor(seconds % 60);
            const parts = [];
            if (days) parts.push(`${days}d`);
            if (hours) parts.push(`${hours}h`);
            if (minutes) parts.push(`${minutes}m`);
            parts.push(`${seconds}s`);
            return parts.join(' ');
        }

        const vpsUptime = os.uptime();
        const botUptime = process.uptime();

        const output = 
            `⏱️ *UPTIME*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🖥️ *VPS Uptime:* ${formatUptime(vpsUptime)}\n` +
            `🤖 *Bot Uptime:* ${formatUptime(botUptime)}\n\n` +
            `📅 *Server Time:* ${new Date().toLocaleString('id-ID')}`;

        await react('✅');
        return output;
    }
};