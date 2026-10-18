// command/converter/sticker.js

import media from '../../lib/media.js';

export default {
    name: 'sticker',
    aliases: ['s'],
    category: 'converter',
    description: 'Convert image/video to sticker',

    async execute(ctx) {
        const { sock, chat } = ctx;
        console.log('[STICKER] ===== START =====');

        const mediaBuffer = await ctx.getMediaFromMessage?.();

        if (!mediaBuffer) {
            console.log('[STICKER] No media found');
            return (
                '❌ Kirim gambar/video atau reply ke media yang ingin dijadikan sticker.\n\n' +
                'Contoh:\n' +
                '.sticker (dengan reply ke gambar/video)'
            );
        }

        console.log('[STICKER] Media size:', mediaBuffer.length, 'bytes');

        await ctx.react('⏳');

        try {
            console.log('[STICKER] Converting to sticker...');
            const stickerBuffer = await media.toSticker(mediaBuffer);
            
            if (!stickerBuffer || stickerBuffer.length === 0) {
                await ctx.react('❌');
                console.log('[STICKER] Result empty');
                return '❌ Gagal membuat sticker. Pastikan file adalah gambar atau video.';
            }

            console.log('[STICKER] Sticker size:', stickerBuffer.length, 'bytes');
            console.log('[STICKER] Sending sticker...');

            // Kirim STICKER SAJA, tanpa caption/text
            await sock.sendMessage(chat, { 
                sticker: stickerBuffer
            });
            
            await ctx.react('✅');
            console.log('[STICKER] ===== SUCCESS =====');
            
            // TIDAK ADA RETURN TEXT - HANYA STICKER

        } catch (error) {
            console.error('[STICKER] Error:', error.message);
            console.error('[STICKER] Stack:', error.stack);
            await ctx.react('❌');
            return `❌ ${error.message || 'Gagal membuat sticker'}`;
        }
    }
};