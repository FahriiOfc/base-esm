// config.js
export default {
    // =========================================
    // Isi config
    // =========================================
    
    ownerNumber: '628xxx', //nomor owner
    ownerName: 'Owner', //nama owner
    botName: 'name', //nama bot
    prefix: ['.', '!', '#'], //prefix
    mode: 'self', //mode bot, default self
    sessionName: 'auth', //nama auth
    selfResponse: true, //bisa respons bot sendiri apa ngga
    autoread: false,
    autotyping: false,
    autovn: false,
    
    // =========================================
    // RECONNECT
    // =========================================
    
    reconnect: {
        enabled: true,
        maxAttempts: 5, //jika reconect, ini maks berapa kali connect
        delay: 5000
    },
    
    // =========================================
    // API KEYS
    // =========================================
    
    lolhumanApiKey: 'isi',
    kyzorohanApiKey: 'isi',

    // =========================================
    // PREMIUM SETTINGS (TAMBAHKAN INI)
    // =========================================
    
    premiumMode: false,
    accessDenied: {
        owner: '❌ Fitur ini khusus Owner.',
        creator: '❌ Fitur ini khusus Creator.',
        premium: '❌ Fitur ini khusus Premium. Ketik .checkprem untuk cek status.'
    }
};
