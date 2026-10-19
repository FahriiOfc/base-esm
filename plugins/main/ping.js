// plugins/main/ping.js
// 🏓 Ping - Bot Latency Checker

export default {
    name: 'ping',
    aliases: ['p', 'speed'],
    category: 'main',
    description: '🏓 Cek kecepatan latensi bot',

    async execute(ctx) {
        const { react, sock, chat } = ctx;

        await react('⏳');
        
        const start = process.hrtime.bigint();
        const sent = await sock.sendMessage(chat, { text: '🏓 Mengukur ping...' });
        const end = process.hrtime.bigint();
        const latency = Number(end - start) / 1000000;

        let status = '🟢 Excellent (Sangat Cepat)';
        if (latency >= 80) status = '🟡 Good (Bagus)';
        if (latency >= 150) status = '🟠 Slow (Agak Lambat)';
        if (latency >= 300) status = '🔴 Very Slow (Sangat Lambat)';

        await sock.sendMessage(chat, {
            text: `🏓 *Pong!*\n\n⚡ *Response :* ${latency.toFixed(2)} ms\n📶 *Status   :* ${status}`,
            edit: sent.key
        });
        
        await react('✅');
    }
};
