// command/vps/status.js
// 📊 Info VPS (Full System)

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export default {
    name: 'status',
    aliases: ['info', 'server'],
    category: 'vps',
    description: '📊 VPS status (CPU/RAM/Disk)',
    ownerOnly: true,

    async execute(ctx) {
        const { react } = ctx;
        await react('⏳');

        try {
            // CPU
            const cpuUsage = os.loadavg()[0].toFixed(2);
            const cpuCores = os.cpus().length;

            // RAM
            const totalMem = os.totalmem() / (1024 * 1024 * 1024);
            const freeMem = os.freemem() / (1024 * 1024 * 1024);
            const usedMem = totalMem - freeMem;
            const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

            // Uptime
            const uptimeSeconds = os.uptime();
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);

            // Disk (full system)
            let diskOutput = '';
            try {
                const { stdout } = await execAsync('df -h / | tail -1');
                const parts = stdout.trim().split(/\s+/);
                diskOutput = `💾 *Disk:* ${parts[4]} used (${parts[2]} of ${parts[1]})`;
            } catch { diskOutput = '💾 *Disk:* Tidak tersedia'; }

            // PM2
            let pm2Status = '';
            try {
                const { stdout } = await execAsync('pm2 list --no-color');
                const lines = stdout.split('\n');
                for (const line of lines) {
                    if (line.includes('FarrMdV1') || line.includes('index')) {
                        const parts = line.split('│').map(s => s.trim());
                        if (parts.length > 3) {
                            pm2Status = `🤖 *Bot:* ${parts[2]} (${parts[3]})`;
                        }
                    }
                }
            } catch { pm2Status = '🤖 *Bot:* PM2 tidak terdeteksi'; }

            // Bot uptime
            const botUptime = process.uptime();
            const bDays = Math.floor(botUptime / 86400);
            const bHours = Math.floor((botUptime % 86400) / 3600);
            const bMinutes = Math.floor((botUptime % 3600) / 60);

            // Hostname
            const hostname = os.hostname();

            const output = 
                `📊 *VPS STATUS*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🖥️ *Hostname:* ${hostname}\n` +
                `⏱️ *Uptime:* ${days}d ${hours}h ${minutes}m\n` +
                `🤖 *Bot Uptime:* ${bDays}d ${bHours}h ${bMinutes}m\n` +
                `📊 *CPU Load:* ${cpuUsage}% (avg 1m) | ${cpuCores} Core\n` +
                `🧠 *RAM:* ${usedMem.toFixed(1)} GB / ${totalMem.toFixed(1)} GB (${memPercent}%)\n` +
                `${diskOutput}\n` +
                `${pm2Status}\n\n` +
                `📅 *Server Time:* ${new Date().toLocaleString('id-ID')}\n` +
                `📦 *Node:* ${process.version}`;

            await react('✅');
            return output;

        } catch (error) {
            await react('❌');
            return `❌ Gagal: ${error.message}`;
        }
    }
};