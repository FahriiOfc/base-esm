import axios from 'axios';

export default {
    name: 'brat',
    aliases: ['bs', 'qc'],
    category: 'tools',
    description: 'Generate brat sticker with text',
    async execute(ctx) {
        const { sock, chat } = ctx;
        let textInput = ctx.text || ctx.args.join(' ') || '';
        if (!textInput && ctx.quoted?.text) {
            textInput = ctx.quoted.text;
        }
        if (!textInput || textInput.trim().length === 0) {
            return '❌ Masukkan teks untuk dibuat sticker brat!';
        }
        await ctx.react('⏳');
        try {
            const bratUrl = `https://api.zaxiusaja.xyz/maker/brat?text=${encodeURIComponent(textInput)}`;
            const response = await axios.get(bratUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            if (!response.data || response.status !== 200) {
                throw new Error('API gagal mengembalikan gambar.');
            }
            const pngBuffer = Buffer.from(response.data);
            const { toSticker } = await import('../../lib/media.js');
            const webpBuffer = await toSticker(pngBuffer);
            if (!webpBuffer || webpBuffer.length === 0) {
                throw new Error('Gagal mengkonversi ke stiker.');
            }
            await sock.sendMessage(chat, {
                sticker: webpBuffer,
                mimetype: 'image/webp'
            });
            await ctx.react('✅');
        } catch (error) {
            console.error('[BRAT] Error:', error.message);
            await ctx.react('❌');
            return '❌ Gagal membuat sticker brat.';
        }
    }
};