// command/group/open.js

export default {
    name: 'open',
    aliases: [],
    category: 'group',
    description: 'Open group (allow all to send messages)',
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

        if (currentSetting === false) {
            return '🔓 Grup *sudah* dalam keadaan TERBUKA.';
        }

        await sock.groupSettingUpdate(chat, 'not_announcement');
        return '🔓 Grup berhasil DIBUKA.';
    }
};