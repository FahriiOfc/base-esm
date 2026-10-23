import { Button } from '../../lib/MessageBuilder.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'sc',
    aliases: ['script'],
    category: 'main',
    description: 'Info script base bot',

    async execute(ctx) {
        const { sock, chat, message } = ctx;

        const url = 'https://github.com/FahriiOfc/base-esm';
        
        const teks = `> 📜 *INFO SCRIPT*\n` +
                     `> Bot ini menggunakan base dari GitHub:\n` +
                     `> 🔗 ${url}\n` +
                     `> Silakan kunjungi link di atas jika ingin melihat source code atau mempelajari base-nya.`;

        let thumbBuffer = null;
        try {
            const thumbPath = path.join(__dirname, '../../thumb/thumb.jpg');
            
            if (fs.existsSync(thumbPath)) {
                thumbBuffer = fs.readFileSync(thumbPath);
            } else {
                console.log('[SC] Thumbnail tidak ditemukan di:', thumbPath);
            }
        } catch (err) {
            console.error('[SC] Gagal membaca thumbnail:', err.message);
        }
        try {
            const btn = new Button(sock)
                .setBody(teks)
                .setFooter('FarrMdV2 Bot')
                .addCopy('📋 Copy Link', url)
                .addUrl('🔗 Buka Link', url);
            
            if (thumbBuffer) {
                btn.setImage(thumbBuffer);
            }
            await btn.send(chat, { quoted: message });
                
        } catch (error) {
            console.error('[SC ERROR] Gagal kirim button, fallback ke teks:', error.message);
            await sock.sendMessage(chat, { 
                text: teks 
            }, { 
                quoted: message 
            });
        }
    }
};
