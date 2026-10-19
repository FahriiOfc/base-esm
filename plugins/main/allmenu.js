// command/main/allmenu.js

import config from '../../config.js';
import settings from '../../lib/settings.js';

function getTimeGreeting() {
    const hour = Number(
        new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            hour12: false
        }).format(new Date())
    );
    if (hour >= 4 && hour < 11) return { emoji: '🌅', text: 'Selamat pagi' };
    if (hour >= 11 && hour < 15) return { emoji: '☀️', text: 'Selamat siang' };
    if (hour >= 15 && hour < 18) return { emoji: '🌇', text: 'Selamat sore' };
    return { emoji: '🌙', text: 'Selamat malam' };
}

function formatDate() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(new Date());
}

function formatTime() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date());
}

function formatRuntime(seconds) {
    seconds = Math.floor(Number(seconds) || 0);
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;
    const result = [];
    if (days) result.push(`${days}d`);
    if (hours) result.push(`${hours}h`);
    if (minutes) result.push(`${minutes}m`);
    result.push(`${seconds}s`);
    return result.join(', ');
}

export default {
    name: 'allmenu',
    aliases: ['all'],
    category: 'main',
    description: 'Show all commands',

    execute(ctx) {
        const greeting = getTimeGreeting();
        const pushName = ctx.pushName || 'User';
        const modeText = settings.getValue('mode') === 'self' ? '🔐 Self Mode' : '🌐 Public Mode';

        return (
            `${greeting.emoji} *${greeting.text}, ${pushName}!*\n\n` +
            '╭━━━〔 🤖 FARRMD V1 〕━━━╮\n' +
            '┃\n' +
            `┃ 👤 User : ${pushName}\n` +
            `┃ 🤖 Mode : ${modeText}\n` +
            `┃ 📅 ${formatDate()}\n` +
            `┃ ⏰ ${formatTime()} WIB\n` +
            `┃ ⏱️ ${formatRuntime(process.uptime())}\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +

            '╭━━━〔 ⚙️ MAIN MENU 〕━━━╮\n' +
            '┃\n' +
            '┃ 🏓 .ping\n' +
            '┃ ⏱️ .runtime\n' +
            '┃ 👑 .owner\n' +
            '┃ 📋 .menu\n' +
            '┃ 📋 .allmenu\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +

            '╭━━━〔 👑 OWNER MENU 〕━━━╮\n' +
            '┃\n' +
            '┃ 🌐 .public\n' +
            '┃ 🔐 .self\n' +
            '┃ ➕ .addcmd\n' +
            '┃ ✏️ .editcmd\n' +
            '┃ 🔄 .reload\n' +
            '┃ ➕ .addowner\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +

            '💡 Gunakan .menu untuk menu utama'
        );
    }
};
