// plugins/main/menu.js

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config.js';
import settings from '../../lib/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_NAME = config.botName || 'FarrMdV2';
const LOCAL_THUMB = path.join(__dirname, '../../thumb/thumb.jpg');

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
    const hourStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta', 
        hour: 'numeric', 
        hour12: false 
    }).format(new Date());
    
    const hour = parseInt(hourStr, 10);

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
            if (fs.existsSync(LOCAL_THUMB)) {
                const thumb = await sharp(LOCAL_THUMB).resize(300, 300, { fit: 'cover' }).jpeg({ quality: 60 }).toBuffer();
                thumbBase64 = thumb.toString('base64');
            } else {
                console.log('[MENU] File thumb/thumb.jpg tidak ditemukan!');
            }
        } catch (e) {
            console.log('[MENU] Gagal load thumbnail:', e.message);
        }

        const runtime = process.uptime();
        const h = Math.floor(runtime / 3600);
        const m = Math.floor((runtime % 3600) / 60);
        const s = Math.floor(runtime % 60);
        const runtimeStr = `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
        
        const dateStr = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta', 
            weekday: 'long', 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric'
        }).format(new Date());
        
        const timeStr = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false
        }).format(new Date()).replace(/\./g, ':'); 

        const botMode = settings.getValue('mode') === 'self' ? 'Self Mode' : 'Public Mode';
        const prefixStatus = getPrefixStatus();
        const greeting = getGreeting();
        
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
                    `Halo @${sender.split('@')[0]}, ${greeting}! 👋\n\n` +
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
                    `┆ ᵎᵎ .debug\n` +
                    `┆ ᵎᵎ .dm\n` +
                    `┆ ᵎᵎ .edit\n` +
                    `┆ ᵎᵎ .eval\n` +
                    `┆ ᵎᵎ .fm\n` +
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
                                        { 
                                            header: "🏠", 
                                            title: "Menu Utama", 
                                            description: "Kembali ke menu utama bot", 
                                            id: ".menu" 
                                        },
                                        { 
                                            header: "⚡", 
                                            title: "Ping", 
                                            description: "Cek kecepatan latensi bot", 
                                            id: ".ping" 
                                        },
                                        { 
                                            header: "👑", 
                                            title: "Owner", 
                                            description: "Hubungi kontak pemilik bot", 
                                            id: ".owner" 
                                        }
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
