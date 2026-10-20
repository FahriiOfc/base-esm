// plugins/main/menu.js

import sharp from 'sharp';
import axios from 'axios';
import config from '../../config.js';
import settings from '../../lib/settings.js';

// ============================================================
// HELPERS
// ============================================================

function getTimeGreeting() {
    const hour = Number(new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false
    }).format(new Date()));
    if (hour >= 4 && hour < 11) return { emoji: '🌅', text: 'Selamat pagi' };
    if (hour >= 11 && hour < 15) return { emoji: '☀️', text: 'Selamat siang' };
    if (hour >= 15 && hour < 18) return { emoji: '🌇', text: 'Selamat sore' };
    return { emoji: '🌙', text: 'Selamat malam' };
}

function formatDate() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta', weekday: 'long', day: '2-digit',
        month: 'long', year: 'numeric'
    }).format(new Date());
}

function formatTime() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit',
        second: '2-digit', hour12: false
    }).format(new Date());
}

function formatRuntime(s) {
    s = Math.floor(Number(s) || 0);
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    const r = [];
    if (d) r.push(`${d}d`); if (h) r.push(`${h}h`); if (m) r.push(`${m}m`);
    r.push(`${s}s`);
    return r.join(', ');
}

async function makeSmallIcon(url, size = 300, quality = 60) {
    try {
        const buf = Buffer.from((await axios.get(url, { responseType: 'arraybuffer' })).data);
        return await sharp(buf).resize(size, size, { fit: 'cover' }).jpeg({ quality }).toBuffer();
    } catch (e) {
        console.log('[MENU] Thumb error:', e.message);
        return null;
    }
}

// ============================================================
// KONFIGURASI
// ============================================================

const BOT_NAME = config.botName; // wajib isi nama bot di config.js
const WA_JID = '0@s.whatsapp.net';
const BOT_WAID = String(config.ownerNumber || '').replace(/\D/g, ''); // untuk pp fakewuoted
const HEADER_IMG = 'https://raw.githubusercontent.com/FahriiOfc/thumb/main/gambar.jpg'; //bisa diganti yang lain, asal public
const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbDytkmBqbrF0rFKr12w';
const NEWSLETTER_JID = '120363412274875891@newsletter'; //bisa ubah make ch sendiri
const NEWSLETTER_NAME = `${BOT_NAME} Channel ✨`;

const MENU_ROWS = [
    { header: '📋 Menu Utama', title: 'Command utama bot', description: 'Tap untuk membuka', id: '.mainmenu' },
    { header: '📋 Semua Menu', title: 'Lihat semua command', description: 'Tap untuk membuka', id: '.allmenu' },
    { header: '👑 Owner Menu', title: 'Command khusus owner', description: 'Tap untuk membuka', id: '.ownermenu' }
]; // kalo mau nambahin, tinggal tambahin aja sesuai keperluan, asal rowidnya benar dan bisa dipanggil 

// ============================================================
// COMMAND
// ============================================================

export default {
    name: 'menu',
    aliases: ['help', '?'],
    category: 'main',
    description: 'Show main menu',

    async execute(ctx) {
        const { sock, chat, sender, pushName, react } = ctx;

        await react('⏳');

        const greeting = getTimeGreeting();
        const modeText = settings.getValue('mode') === 'self' ? '🔐 Self Mode' : '🌐 Public Mode';
        const fileNameDisplay = `${greeting.text} ${greeting.emoji}`;

        const bodyText =
            `Hallo Kak *@${sender.split('@')[0]}*\n\n` +
            `${greeting.emoji} ${greeting.text}, ${pushName || 'User'}!\n\n` +
            `╭─ \`INFORMASI BOT\` 𝜗ৎ\n` +
            `┆ ᵎᵎ Nama Bot : *${BOT_NAME}*\n` +
            `┆ ᵎᵎ Owner Bot : *${config.ownerName}*\n` +
            `┆ ᵎᵎ Prefix : *.*\n` +
            `┆ ᵎᵎ Mode : *${modeText}*\n` +
            `┆ ᵎᵎ Runtime : *${formatRuntime(process.uptime())}*\n` +
            `┆ ᵎᵎ Tanggal : *${formatDate()}*\n` +
            `┆ ᵎᵎ Waktu : *${formatTime()} WIB*\n` +
            `╰─────\n\n` +
            `silahkan tekan tombol dibawah untuk memilih menu`;

        try {
            const { prepareWAMessageMedia, generateWAMessageFromContent, generateMessageIDV2 } = await import('@whiskeysockets/baileys');

            // ---------- Upload media (document) ----------
            const thumb = await makeSmallIcon(HEADER_IMG, 300, 60);
            const img = await makeSmallIcon(HEADER_IMG, 800, 85);

            const upload = await prepareWAMessageMedia(
                {
                    document: img || thumb,
                    mimetype: 'image/png',
                    fileName: fileNameDisplay
                },
                { upload: sock.waUploadToServer }
            );

            upload.documentMessage.fileLength = '100000000000000';
            upload.documentMessage.fileName = fileNameDisplay;
            upload.documentMessage.jpegThumbnail = thumb;

            // ---------- Build interactiveMessage ----------
            const interactiveMessage = {
                header: {
                    title: '',
                    subtitle: '',
                    documentMessage: upload.documentMessage,
                    hasMediaAttachment: true
                },
                body: { text: bodyText },
                footer: { text: `© ${BOT_NAME} ${new Date().getFullYear()}` },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: 'Pilihan Menu',
                                sections: [{
                                    title: '🍀 Silahkan pilih menu yang kamu inginkan',
                                    highlight_label: BOT_NAME,
                                    rows: MENU_ROWS
                                }],
                                has_multiple_buttons: true
                            })
                        }
                    ],
                    messageParamsJson: JSON.stringify({
                        limited_time_offer: {
                            text: 'Gunakan bot ini dengan bijak yak',
                            url: CHANNEL_URL,
                            copy_code: BOT_NAME,
                            expiration_time: Date.now() + 86400000
                        },
                        bottom_sheet: {
                            in_thread_buttons_limit: 2,
                            divider_indices: [1, 2, 3, 4, 5, 999],
                            list_title: 'Pilih Menu',
                            button_title: '🍀 Pilih Menu Disini'
                        }
                    })
                },
                contextInfo: {
                    participant: WA_JID,
                    remoteJid: 'status@broadcast',
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: NEWSLETTER_JID,
                        serverMessageId: 127,
                        newsletterName: NEWSLETTER_NAME
                    },
                    quotedMessage: {
                        contactMessage: {
                            displayName: `🪸 ${BOT_NAME}`,
                            vcard: `BEGIN:VCARD
VERSION:3.0
N:XL;ttname,;;;
FN:ttname
item1.TEL;waid=${BOT_WAID}:+${BOT_WAID}
item1.X-ABLabel:Ponsel
END:VCARD`
                        }
                    }
                }
            };

            // ---------- Build WAMessage ----------
            const msg = generateWAMessageFromContent(
                chat,
                { interactiveMessage },
                { messageId: generateMessageIDV2(), userJid: sock.user?.id }
            );

            // ---------- Relay manual ----------
            await sock.relayMessage(msg.key.remoteJid, msg.message, {
                messageId: msg.key.id,
                additionalAttributes: { expiration: '86400' },
                additionalNodes: [
                    {
                        tag: 'biz',
                        attrs: {
                            actual_actors: '2',
                            host_storage: '2',
                            privacy_mode_ts: String(Math.floor(Date.now() / 1000))
                        },
                        content: [
                            {
                                tag: 'engagement',
                                attrs: {
                                    customer_service_state: 'open',
                                    conversation_state: 'open'
                                }
                            },
                            {
                                tag: 'interactive',
                                attrs: { type: 'native_flow', v: '1' },
                                content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                            }
                        ]
                    },
                    // 👇 INI DIA 1 BARIS AJAIB YANG DITAMBAHKAN 👇
                    ...(chat.endsWith('@g.us') ? [] : [{ tag: 'bot', attrs: { biz_bot: '1' } }])
                ]
            });

            await react('✅');

        } catch (error) {
            console.log('[MENU] Error:', error.message);
            console.log('[MENU] Stack:', (error.stack || '').split('\n').slice(0, 4).join('\n'));
            await react('❌');
            await ctx.reply(`❌ Menu gagal render: ${error.message}`);
        }
    }
};
