// plugins/owner/shell.js
// ⚡ Shell — Jalankan perintah shell (output mentah)
// Custom prefix: $ (tanpa harus pakai titik)

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================
// BERSIHIN ANSI (KHUSUS PM2 STATUS)
// ============================================================

function cleanAnsi(text) {
    return text
        .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
        .replace(/\u001b\[[0-9;]*m/g, '')
        .replace(/\[[0-9]+m/g, '');
}

export default {
    name: 'shell',
    aliases: ['cmd', 'terminal', 'exec'],
    category: 'owner',
    description: '⚡ Jalankan perintah shell (output mentah)',
    ownerOnly: true,

    // ✅ Custom prefix: `$ <command>` tanpa butuh titik
    customPrefix: /^\$/,

    async execute(ctx) {
        const { args, react, sock, chat, replyWithForward, text } = ctx;

        // ---------- AMBIL COMMAND ----------
        // Karena customPrefix match `$`, kita strip `$` dari text
        let raw = (text || '').trim();

        // Hapus prefix `$` di awal
        if (raw.startsWith('$')) {
            raw = raw.slice(1).trim();
        }

        // Fallback ke args kalau text kosong
        if (!raw && args && args.length > 0) {
            raw = args.join(' ').trim();
        }

        // ---------- VALIDASI ----------
        if (!raw) {
            await react('❌');
            return (
                '⚡ *Shell Command*\n\n' +
                '❌ Masukkan perintah!\n\n' +
                '📌 *Contoh:*\n' +
                '$ ls -la\n' +
                '$ whoami\n' +
                '$ pm2 status\n' +
                '.shell ls -la'
            );
        }

        const command = raw;
        await react('⏳');

        // ---------- KIRIM PESAN PROGRESS ----------
        let sent;
        try {
            sent = await replyWithForward(`$ ${command}\n\n⏳ Menjalankan...`);
        } catch (e) {
            sent = await sock.sendMessage(chat, { text: `$ ${command}\n\n⏳ Menjalankan...` });
        }

        const start = process.hrtime.bigint();

        try {
            const { stdout, stderr } = await execAsync(command, {
                timeout: 120000,
                maxBuffer: 1024 * 1024 * 100,
                shell: '/bin/bash',
                cwd: process.cwd()
            });

            const elapsedNs = Number(process.hrtime.bigint() - start);
            const elapsed = (elapsedNs / 1000000000).toFixed(2);

            let output = (stdout + stderr).trim();

            if (command.trim().startsWith('pm2 status') && output) {
                output = cleanAnsi(output);
            }

            if (!output) {
                output = '✅ Done (no output)';
            }

            if (output.length > 60000) {
                output = output.slice(0, 60000) + '\n\n... (truncated)';
            }

            await sock.sendMessage(chat, {
                text: `$ ${command}\n\n${output}\n\n⏱️ ${elapsed}s`,
                edit: sent.key
            });

            await react('✅');

        } catch (error) {
            const stdout = error.stdout || '';
            const stderr = error.stderr || '';
            let output = (stdout + stderr).trim();

            const elapsedNs = Number(process.hrtime.bigint() - start);
            const elapsed = (elapsedNs / 1000000000).toFixed(2);

            if (command.trim().startsWith('pm2 status') && output) {
                output = cleanAnsi(output);
            }

            if (!output) {
                output = `❌ ${error.message}`;
            }

            if (output.length > 60000) {
                output = output.slice(0, 60000) + '\n\n... (truncated)';
            }

            await sock.sendMessage(chat, {
                text: `$ ${command}\n\n${output}\n\n⏱️ ${elapsed}s (error)`,
                edit: sent.key
            });

            await react('❌');
        }
    }
};