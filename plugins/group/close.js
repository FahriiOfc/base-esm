// command/group/close.js

export default {
    name: 'close',
    aliases: [],
    category: 'group',
    description: 'Close group (admin only can send messages)',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,

    async execute(ctx) {
        const { sock, chat } = ctx;

        let currentSetting = null;
        try {
            const groupMetadata = await sock.groupMetadata(chat);
            currentSetting = groupMetadata?.announce;
        } catch (error) {}

        if (currentSetting === true) {
            return '🔒 Grup *sudah* dalam keadaan TERTUTUP.';
        }

        await sock.groupSettingUpdate(chat, 'announcement');
        return '🔒 Grup berhasil DITUTUP.';
    }
};