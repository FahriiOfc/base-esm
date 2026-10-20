// plugins/main/menu.js

import sharp from 'sharp';
import axios from 'axios';
import config from '../../config.js';

const BOT_NAME = config.botName || 'FarrMdV2';
const HEADER_IMG = 'https://raw.githubusercontent.com/FahriiOfc/thumb/main/gambar.jpg'; //ubah header, kalo mau lokal, cari tau sendiri

function getPrefixStatus() {
    try {
        const PREFIX_DB = path.join(__dirname, '../../database/modeprefix.json');
        if (fs.existsSync(PREFIX_DB)) {
            const data = JSON.parse(fs.readFileSync(PREFIX_DB, 'utf8'));
            return data.enabled !== false ? 'On' : 'Off';
        } else {
            return config.modePrefix !== false ? 'On' : 'Off';
        }
    } catch (e) {
        return config.modePrefix !== false ? 'On' : 'Off';
    }
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 18) return 'Selamat sore';
    return 'Selamat malam';
}

export default {
    name: 'menu',
    aliases: ['help', '?'],
    category: 'main',
    description: 'Show main menu',

    async execute(ctx) {
        const { sock, chat, sender, react } = ctx;
        await react('⏳');
        
        let thumbBase64 = null;
        try {
            const buf = Buffer.from((await axios.get(HEADER_IMG, { responseType: 'arraybuffer' })).data);
            const thumb = await sharp(buf).resize(300, 300, { fit: 'cover' }).jpeg({ quality: 60 }).toBuffer();
            thumbBase64 = thumb.toString('base64');
        } catch (e) {
            console.log('[MENU] Gagal load thumbnail:', e.message);
        }

        const runtime = process.uptime();
        const h = Math.floor(runtime / 3600);
        const m = Math.floor((runtime % 3600) / 60);
        const s = Math.floor(runtime % 60);
        const runtimeStr = `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
        const dateStr = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        }).format(new Date());
        
        const timeStr = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(new Date());
        
        const botMode = settings.getValue('mode') === 'self' ? 'Self Mode' : 'Public Mode';
        
        const msgContent = {
            buttonsMessage: {
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: BOT_NAME,
                    address: `Runtime: ${runtimeStr}`,
                    ...(thumbBase64 && { jpegThumbnail: thumbBase64 })
                },
                    contentText: 
                    `乂 *BOT INFORMATION*\n\n` +
                    `Halo @${sender.split('@')[0]}, ${getGreeting()}! 👋\n\n` +
                    `╭─ \`INFORMASI\` 𝜗ৎ\n` +
                    `┆ ᵎᵎ Owner : *${config.ownerName || 'Owner'}*\n` +
                    `┆ ᵎᵎ Prefix : *${prefixStatus}*\n` +
                    `┆ ᵎᵎ Mode : *${botMode}*\n` +
                    `┆ ᵎᵎ Runtime : *${runtimeStr}*\n` +
                    `┆ ᵎᵎ Tanggal : *${dateStr}*\n` +
                    `┆ ᵎᵎ Waktu : *${timeStr} WIB*\n` +
                    `╰─────\n\n` +
                    `╭─ \`MAIN MENU\` 𝜗ৎ\n` +
                    `┆ ᵎᵎ .menu\n` +
                    `┆ ᵎᵎ .runtime\n` +
                    `┆ ᵎᵎ .ping\n` +
                    `┆ ᵎᵎ .owner\n` +
                    `╰─────\n\n` +
                    `╭─ \`OWNER MENU\` 𝜗ৎ\n` +
                    `┆ ᵎᵎ .addcmd\n` +
                    `┆ ᵎᵎ .addowner\n` +
                    `┆ ᵎᵎ .addprem\n` +
                    `┆ ᵎᵎ .backup\n` +
                    `┆ ᵎᵎ .cat\n` +
                    `┆ ᵎᵎ .cat2\n` +
                    `┆ ᵎᵎ .edit\n` +
                    `┆ ᵎᵎ .eval\n` +
                    `┆ ᵎᵎ .get\n` +
                    `┆ ᵎᵎ .public\n` +
                    `┆ ᵎᵎ .reload\n` +
                    `┆ ᵎᵎ .restart\n` +
                    `┆ ᵎᵎ .run\n` +
                    `┆ ᵎᵎ .shell\n` +
                    `┆ ᵎᵎ .status\n` +
                    `┆ ᵎᵎ .uptime\n` +
                    `╰─────\n\n` +
                    `_Silakan pilih menu di bawah ini._`,
                footerText: BOT_NAME,
                contextInfo: {
                    mentionedJid: [sender]
                },
                buttons: [
                    {
                        buttonId: "menu",
                        buttonText: { displayText: "📋 MENU" },
                        type: 1,
                        nativeFlowInfo: {
                            name: "single_select",
                            paramsJson: JSON.stringify({
                                title: "Pilih Menu",
                                sections: [{
                                    title: "Main Menu",
                                    highlight_label: BOT_NAME,
                                    rows: [
                                        { header: "", title: "Menu Utama", id: ".menu", highlight_label: "Semua Fitur" },
                                        { header: "", title: "Ping", id: ".ping", highlight_label: "Cek Bot" },
                                        { header: "", title: "Owner", id: ".owner", highlight_label: "Kontak" }
                                    ]
                                }]
                            })
                        }
                    },
                    {
                        buttonId: ".ping",
                        buttonText: { displayText: "⚡ PING" },
                        type: 1
                    }
                ],
                headerType: 6
            }
        };
        await sock.relayMessage(
            chat,
            msgContent,
            {
                additionalNodes: [
                    {
                        tag: "biz",
                        attrs: {},
                        content: [
                            {
                                tag: "interactive",
                                attrs: { type: "native_flow", v: "1" },
                                content: [
                                    { tag: "native_flow", attrs: { v: "9", name: "mixed" } }
                                ]
                            }
                        ]
                    }
                ]
            }
        );

        await react('✅');
    }
};
