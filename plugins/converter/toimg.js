// command/converter/toimg.js

import media from '../../lib/media.js';

export default {
    name: 'toimg',
    aliases: [],
    category: 'converter',
    description: 'Convert sticker to image',

    async execute(ctx) {
        const { sock, chat } = ctx;

        const mediaBuffer = await ctx.getMediaFromMessage?.();

        if (!mediaBuffer) {
            return '❌ Reply ke sticker yang ingin diubah menjadi gambar.';
        }

        await ctx.react('⏳');

        try {
            const imageBuffer = await media.toImage(mediaBuffer);
            
            if (!imageBuffer || imageBuffer.length === 0) {
                await ctx.react('❌');
                return '❌ Gagal mengubah sticker ke gambar.';
            }

            await sock.sendMessage(chat, {
                image: imageBuffer,
                caption: '✅ Berhasil diubah menjadi gambar'
            });
            await ctx.react('✅');
        } catch (error) {
            await ctx.react('❌');
            return `❌ ${error.message || 'Gagal mengubah ke gambar'}`;
        }
    }
};