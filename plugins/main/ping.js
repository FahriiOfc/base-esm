// command/tools/ping.js
// 🏓 Ping - Terminal Style

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================
// DELAY HELPER
// ============================================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
    name: 'ping',
    aliases: ['p', 'pingip'],
    category: 'tools',
    description: '🏓 Ping bot atau IP/domain (terminal style)',

    async execute(ctx) {
        const { args, react, sock, chat, sender } = ctx;

        // ============================================================
        // JIKA TANPA ARGUMEN → PING BOT
        // ============================================================

        if (!args || args.length === 0) {
            await react('⏳');
            
            const start = process.hrtime.bigint();
            const sent = await sock.sendMessage(chat, { text: '🏓 Mengukur ping...' });
            const latency = Number(process.hrtime.bigint() - start) / 1000000;

            let status = '🟢 Excellent';
            if (latency >= 80) status = '🟡 Good';
            if (latency >= 150) status = '🟠 Slow';
            if (latency >= 300) status = '🔴 Very Slow';

            await sock.sendMessage(chat, {
                text: `🏓 *Pong!*\n\n⚡ Response : ${latency.toFixed(2)} ms\n📶 Status   : ${status}`,
                edit: sent.key
            });
            
            await react('✅');
            return;
        }

        // ============================================================
        // PING KE IP/DOMAIN (TERMINAL STYLE)
        // ============================================================

        const target = args[0];
        const count = 4; // FIXED: selalu 4

        await react('⏳');

        // ============================================================
        // KIRIM PESAN AWAL (AKAN DI-EDIT)
        // ============================================================

        const sent = await sock.sendMessage(chat, {
            text: `~ $ ping -c ${count} ${target}\n🔄 Menghubungi target...`
        });

        await delay(300);

        try {
            // Jalankan ping command
            const { stdout, stderr } = await execAsync(
                `ping -c ${count} -W 2 ${target}`,
                {
                    timeout: 30000,
                    maxBuffer: 1024 * 1024
                }
            );

            if (stderr && !stderr.includes('ping')) {
                console.log('[PING] Stderr:', stderr);
            }

            const lines = stdout.split('\n').filter(line => line.trim());
            
            // ============================================================
            // BUILD RESPONSE SEPERTI TERMINAL
            // ============================================================

            let response = `~ $ ping -c ${count} ${target}\n`;

            // Parse header (PING ...)
            for (const line of lines) {
                if (line.includes('PING') && line.includes('bytes of data')) {
                    response += `${line}\n`;
                    break;
                }
            }

            // Proses setiap respons ping
            let pingCount = 0;
            for (const line of lines) {
                // Skip header & summary
                if (line.includes('PING') || 
                    line.includes('packets transmitted') || 
                    line.includes('rtt') || 
                    line.includes('ping statistics') ||
                    line.includes('---')) {
                    continue;
                }

                // Cari ping response
                const match = line.match(/(\d+) bytes from .*: icmp_seq=(\d+) ttl=(\d+) time[=<](\d+\.?\d*)\s*ms/);
                if (match) {
                    const bytes = match[1];
                    const seq = match[2];
                    const ttl = match[3];
                    const time = match[4];

                    pingCount++;
                    response += `${bytes} bytes from ${target} (${target}): icmp_seq=${seq} ttl=${ttl} time=${time} ms\n`;

                    // Edit message setiap respons
                    await sock.sendMessage(chat, {
                        text: response,
                        edit: sent.key
                    });

                    await delay(200);
                }
            }

            // ============================================================
            // TAMBAHKAN SUMMARY (TERMINAL STYLE)
            // ============================================================

            // Cari summary
            for (const line of lines) {
                if (line.includes('---') && line.includes('ping statistics')) {
                    response += `\n${line}\n`;
                }
                if (line.includes('packets transmitted')) {
                    response += `${line}\n`;
                }
                if (line.includes('rtt')) {
                    response += `${line}`;
                }
            }

            // Jika tidak ada summary, buat manual
            if (!response.includes('packets transmitted')) {
                const summaryMatch = stdout.match(/(\d+)\s+packets transmitted,\s+(\d+)\s+received/);
                if (summaryMatch) {
                    const transmitted = summaryMatch[1];
                    const received = summaryMatch[2];
                    const loss = transmitted > 0 ? ((transmitted - received) / transmitted * 100).toFixed(0) : 100;
                    response += `\n--- ${target} ping statistics ---\n`;
                    response += `${transmitted} packets transmitted, ${received} received, ${loss}% packet loss, time 3005ms\n`;
                    
                    // Coba ambil rtt
                    const rttMatch = stdout.match(/rtt min\/avg\/max\/mdev = ([0-9.]+)\/([0-9.]+)\/([0-9.]+)\/([0-9.]+)/);
                    if (rttMatch) {
                        response += `rtt min/avg/max/mdev = ${rttMatch[1]}/${rttMatch[2]}/${rttMatch[3]}/${rttMatch[4]} ms`;
                    }
                }
            }

            // Edit terakhir
            await sock.sendMessage(chat, {
                text: response,
                edit: sent.key
            });

            await react('✅');

        } catch (error) {
            console.error('[PING] Error:', error.message);
            await react('❌');

            let errorMsg = `~ $ ping -c ${count} ${target}\n\n`;

            if (error.code === 'ENOENT') {
                errorMsg += '❌ ping: command not found';
            } else if (error.killed || error.signal === 'SIGTERM') {
                errorMsg += '⏰ ping: timeout - target tidak merespons';
            } else if (error.message.includes('Name or service not known')) {
                errorMsg += `ping: ${target}: Name or service not known`;
            } else if (error.message.includes('Network is unreachable')) {
                errorMsg += 'ping: Network is unreachable';
            } else {
                errorMsg += `❌ ping: ${error.message}`;
            }

            await sock.sendMessage(chat, {
                text: errorMsg,
                edit: sent.key
            });
        }
    }
};