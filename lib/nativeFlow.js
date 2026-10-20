// lib/nativeFlow.js
import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';

export async function sendNativeFlow(sock, jid, options) {
    const {
        text = '',
        footer = '',
        title = '',
        imageUrl = null,
        buttons = [],
        quoted = null,
        isDocument = false // Opsi khusus jika ingin pakai document header
    } = options;

    const isGroup = jid.endsWith('@g.us');
    let mediaAttachment = {};

    if (imageUrl) {
        const mediaType = isDocument ? { document: { url: imageUrl }, mimetype: 'image/png', fileName: 'menu.png' } : { image: { url: imageUrl } };
        const media = await prepareWAMessageMedia(mediaType, { upload: sock.waUploadToServer });
        
        if (isDocument) {
            media.documentMessage.fileLength = '100000000000000';
            media.documentMessage.fileName = 'menu.png';
            mediaAttachment = { hasMediaAttachment: true, documentMessage: media.documentMessage };
        } else {
            mediaAttachment = { hasMediaAttachment: true, imageMessage: media.imageMessage };
        }
    }

    const formattedButtons = buttons.map(btn => ({
        name: btn.name,
        buttonParamsJson: typeof btn.params === 'string' ? btn.params : JSON.stringify(btn.params)
    }));

    const content = {
        interactiveMessage: {
            header: {
                title: title,
                subtitle: '',
                hasMediaAttachment: !!imageUrl,
                ...mediaAttachment
            },
            body: { text: text },
            footer: { text: footer },
            nativeFlowMessage: {
                buttons: formattedButtons,
                messageParamsJson: ''
            }
        }
    };

    const msg = generateWAMessageFromContent(jid, content, { quoted });

    const additionalNodes = [
        {
            tag: 'biz',
            attrs: { actual_actors: '2', host_storage: '2', privacy_mode_ts: String(Math.floor(Date.now() / 1000)) },
            content: [
                { tag: 'engagement', attrs: { customer_service_state: 'open', conversation_state: 'open' } },
                { tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }
            ]
        }
    ];

    if (!isGroup) additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });

    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id, additionalNodes });
    return msg;
}
