// command/owner/addprem.js
import premium from '../../lib/premium.js';

export default {
    name: 'addprem',
    aliases: ['addpremium'],
    category: 'owner',
    description: '➕ Tambah user premium (reply/nomor/@mention) + durasi (menit)',
    ownerOnly: true,

    async execute(ctx) {
        const { args, quoted, react, reply, sender, mentionedJid } = ctx;
        let target = '';
        let duration = 0;

        if (args && args.length >= 2) {
            const firstArg = args[0];
            if (!firstArg.startsWith('@')) {
                target = firstArg.replace(/\D/g, '');
                duration = parseInt(args[1]);
            }
        }
        if (!target && mentionedJid && mentionedJid.length > 0) {
            const jid = mentionedJid[0];
            const number = jid.split('@')[0].replace(/\D/g, '');
            if (number && number.length >= 6) {
                target = number;
                for (const arg of (args || [])) {
                    const num = parseInt(arg);
                    if (!isNaN(num) && num > 0) {
                        duration = num;
                        break;
                    }
                }
            }
        }

        if (!target && quoted?.sender) {
            const number = quoted.sender.split('@')[0].replace(/\D/g, '');
            if (number && number.length >= 6) {
                target = number;
                if (args && args.length >= 1) {
                    duration = parseInt(args[0]);
                }
            }
        }
        if (!target && args && args.length >= 1) {
            const possibleNumber = args[0].replace(/\D/g, '');
            if (possibleNumber && possibleNumber.length >= 6) {
                target = possibleNumber;
                if (args.length >= 2) {
                    duration = parseInt(args[1]);
                }
            }
        }
        if (target && !duration) {
            for (const arg of (args || [])) {
                const num = parseInt(arg);
                if (!isNaN(num) && num > 0) {
                    duration = num;
                    break;
                }
            }
        }

        if (!target || target.length < 6) {
            await react('❌');
            const msg = 
                '➕ *Add Premium*\n\n' +
                '❌ Tentukan target!\n\n' +
                '📌 *Cara penggunaan:*\n' +
                '.addprem <nomor> <durasi>\n' +
                '.addprem <durasi> (reply ke target)\n' +
                '.addprem <durasi> @target\n\n' +
                '📌 *Durasi dalam MENIT:*\n' +
                '• 60 = 1 jam\n' +
                '• 1440 = 1 hari\n' +
                '• 10080 = 1 minggu\n' +
                '• 43200 = 1 bulan';
            return msg;
        }

        if (!duration || duration < 1) {
            await react('❌');
            const msg = 
                '❌ Durasi harus berupa angka positif (dalam menit)!\n\n' +
                '📌 *Contoh:*\n' +
                '.addprem 6281234567890 60\n' +
                '.addprem 60 @6281234567890';
            return msg;
        }

        await react('⏳');
        const result = premium.addPremium(target, duration, sender);

        if (!result.success) {
            await react('❌');
            return result.message;
        }

        await react('✅');
        return result.message;
    }
};
