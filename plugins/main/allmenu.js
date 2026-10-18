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
            '┃ 📋 .mainmenu\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +

            '╭━━━〔 👑 OWNER MENU 〕━━━╮\n' +
            '┃\n' +
            '┃ 🌐 .public\n' +
            '┃ 🔐 .self\n' +
            '┃ 📖 .autoread\n' +
            '┃ ⌨️ .autotyping\n' +
            '┃ 🎙️ .autovn\n' +
            '┃ 🗑️ .del\n' +
            '┃ 🖼️ .setppbot\n' +
            '┃ 🗑️ .delppbot\n' +
            '┃ 📸 .getpp\n' +
            '┃ ⛔ .blgrup\n' +
            '┃ ✅ .unblgrup\n' +
            '┃ 📋 .listblgrup\n' +
            '┃ ⛔ .bluser\n' +
            '┃ ✅ .unbluser\n' +
            '┃ 📋 .listbluser\n' +
            '┃ 📄 .getcmd\n' +
            '┃ ➕ .addcmd\n' +
            '┃ ✏️ .editcmd\n' +
            '┃ ↩️ .restorecmd\n' +
            '┃ ❌ .delcmd\n' +
            '┃ 📂 .listcmd\n' +
            '┃ 📋 .logcmd\n' +
            '┃ 🔄 .restart\n' +
            '┃ 🐛 .debug\n' +
            '┃ 📇 .cc\n' +
            '┃ ➕ .addowner\n' +
            '┃ ❌ .delowner\n' +
            '┃ 📋 .listowner\n' +
            '┃ 🔄 .setowner\n' +
            '┃ 🐛 .debug\n' +
            '┃ 🤖 .aimode (on/off)\n' +
            '┃ 👑 .ownermenu\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +

            '╭━━━〔 👥 GROUP MENU 〕━━━╮\n' +
            '┃\n' +
            '┃ 👥 .tagall\n' +
            '┃ 📢 .hidetag\n' +
            '┃ 🔓 .open\n' +
            '┃ 🔒 .close\n' +
            '┃ ⬆️ .promote\n' +
            '┃ ⬇️ .demote\n' +
            '┃ 🦶 .kick\n' +
            '┃ ➕ .add\n' +
            '┃ 🔗 .linkgc\n' +
            '┃ ♻️ .revoke\n' +
            '┃ 🔇 .mute\n' +
            '┃ 🔊 .unmute\n' +
            '┃ 📋 .listmute\n' +
            '┃ 📸 .setpp\n' +
            '┃ 🗑️ .delpp\n' +
            '┃ 🏞️ .getppgc\n' +
            '┃ 📌 .pin\n' +
            '┃ 📌 .unpin\n' +
            '┃ 📝 .setdesc\n' +
            '┃ 🗑️ .deldesc\n' +
            '┃ 📄 .getdesc\n' +
            '┃ ✏️ .rename\n' +
            '┃ 🔄 .resetname\n' +
            '┃ 👥 .groupmenu\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +

            '╭━━━〔 🖼️ CONVERTER MENU 〕━━━╮\n' +
            '┃\n' +
            '┃ 🖼️ .sticker\n' +
            '┃ 🖼️ .toimg\n' +
            '┃ 🎬 .tovideo\n' +
            '┃ 🎵 .tomp3\n' +
            '┃ 🎤 .tovn\n' +
            '┃ 🖼️ .stickermenu\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +

            '╭━━━〔 📥 DOWNLOADER MENU 〕━━━╮\n' +
            '┃\n' +
            '┃ 🎵 .ytmp3\n' +
            '┃ 🎬 .ytmp4\n' +
            '┃ 🎵 .tiktok <url>\n' +
            '┃ 📸 .igdl <url>\n' +
            '┃ 📹 .fbdl <url>\n' +
            '┃ 📦 .github\n' +
            '┃ 🎯 .dl <url> [auto detect]\n' +
            '┃ 🎬 .ytdl <url> [mp3/mp4]\n' +
            '┃ 🐦 .twitterdl <url>\n' +
            '┃ 📌 .pindl <url>\n' +
            '┃ 📥 .downloadmenu\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +

            '╭━━━〔 🖼️ IMAGE & TOOLS 〕━━━╮\n' +
            '┃\n' +
            '┃ ✂️ .removebg (reply gambar)\n' +
            '┃ 🔍 .upscale (reply gambar)\n' +
            '┃ 🔄 .mconvert <target> (reply file)\n' +
            '┃ 📧 .tempmail <create/inbox>\n' +
            '┃ 🖼️ .brat <teks>\n' +
            '┃ 📸 .ssweb <url>\n' +
            '┃ 🌐 .google <query>\n' +
            '┃ 🖼️ .wallpaper <query>\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +

            '╭━━━〔 🤖 AI CHAT MENU 〕━━━╮\n' +
            '┃\n' +
            '┃ 💬 .claude <pesan>\n' +
            '┃ 💬 .gpt5 <pesan>\n' +
            '┃ 💬 .unlimitedai [karakter] <pesan>\n' +
            '┃    └─ karakter: ourin, kobo, waguri, jokowi, prabowo\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +

            '💡 Gunakan .menu untuk menu utama'
        );
    }
};