import util from 'util';
import * as baileys from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export default {
    name: 'eval',
    aliases: ['e', 'ev'],
    category: 'owner',
    description: '🧪 Jalankan kode JavaScript (=> kode)',
    ownerOnly: true,

    customPrefix: /^=>/,

    async execute(ctx) {
        const { sock, chat, sender, message, quoted, args, text, react, reply } = ctx;
        let code = '';
        if (text && text.trim()) {
            code = text.trim();
        }
        if (!code && args && args.length > 0) {
            code = args.join(' ');
        }
        if (!code && quoted?.text) {
            code = quoted.text;
        }
        if (code.startsWith('=>')) {
            code = code.slice(2).trim();
        }
        if (!code || code.length === 0) {
            await react('❌');
            return (
                'Masukan code Eval. Contoh:\n=> await sock.sendMessage(chat, { text: "Halo" })');}
        await react('⏳');
        console.log('[EVAL] Code:', code.slice(0, 100));
        const isExpression =
            !/^(const|let|var|if|for|while|do|switch|try|throw|return|class|function|async\s+function|async\s*\()\b/.test(code) &&
            !/[;{}]\s*$/.test(code) &&
            !code.includes('\n');

        const body = isExpression ? `return (${code})` : code;
        
        const m = {
            id: message.key.id,
            chat: chat,
            sender: sender,
            key: message.key,
            message: message.message,
            quoted: quoted,
            reply: async (t) => {
                await sock.sendMessage(chat, { text: String(t) });
            }
        };

        const context = {
            m: m,
            conn: sock,
            sock: sock,
            WaSocket: sock,
            client: sock,
            chat: chat,
            sender: sender,
            ctx: ctx,
            message: message,
            quoted: quoted,
            args: args,
            text: text,

            console: console,
            Buffer: Buffer,
            crypto: crypto,
            util: util,
            global: global,
            process: process,

            fs: fs,
            path: path,
            axios: axios,

            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
            setInterval: setInterval,
            clearInterval: clearInterval,
            Promise: Promise,
            JSON: JSON,
            Object: Object,
            Array: Array,
            String: String,
            Number: Number,
            Boolean: Boolean,
            Math: Math,
            Date: Date,
            RegExp: RegExp,
            Error: Error,
        };

        context.baileys = baileys;
        context.generateWAMessageFromContent = baileys.generateWAMessageFromContent;
        context.generateWAMessage = baileys.generateWAMessage;
        context.generateMessageIDV2 = baileys.generateMessageIDV2;
        context.proto = baileys.proto;
        context.downloadMediaMessage = baileys.downloadMediaMessage;
        context.prepareWAMessageMedia = baileys.prepareWAMessageMedia;
        context.encodeWAMessage = baileys.encodeWAMessage;
        context.encodeSignedDeviceIdentity = baileys.encodeSignedDeviceIdentity;
        context.DisconnectReason = baileys.DisconnectReason;
        context.delay = baileys.delay || ((ms) => new Promise(r => setTimeout(r, ms)));

        if (ctx.isOwner !== undefined) context.isOwner = ctx.isOwner;
        if (ctx.isAdmin !== undefined) context.isAdmin = ctx.isAdmin;
        if (ctx.isGroup !== undefined) context.isGroup = ctx.isGroup;
        if (ctx.fromMe !== undefined) context.fromMe = ctx.fromMe;

        let result;
        let error = null;

        try {
            const keys = Object.keys(context);
            const values = Object.values(context);

            const fn = new AsyncFunction(...keys, `"use strict";\n${body}`);
            result = await fn(...values);

        } catch (e) {
            error = e;
        }

        let output;
        const mentions = [];

        if (error) {
            output =
                `❌ *Eval Error*\n\n` +
                `${error.name}: ${error.message}\n\n` +
                `\`\`\`\n${(error.stack || '').split('\n').slice(0, 4).join('\n')}\n\`\`\``;
            await react('❌');
        } else if (result === undefined) {
            output = `✅ *Executed*\n\n_Return: undefined_`;
            await react('✅');
        } else if (typeof result === 'string') {
            output = result;

            const matches = result.match(/@(\d+)/g) || [];
            for (const match of matches) {
                const num = match.slice(1);
                const jid = `${num}@lid`;
                if (!mentions.includes(jid)) mentions.push(jid);
            }

            await react('✅');
        } else {
            let resultStr = util.inspect(result, {
                depth: 3,
                colors: false,
                maxArrayLength: 50,
                maxStringLength: 2000
            });

            if (resultStr.length > 3800) {
                resultStr = resultStr.slice(0, 3800) + '\n... (truncated)';
            }

            output =`${resultStr}`;
            await react('✅');
        }

        console.log('[EVAL] Output length:', output.length, '| mentions:', mentions.length);

        try {
            const allMentions = [...new Set([...mentions, sender])].filter(Boolean);

            await sock.sendMessage(chat, {
                text: output,
                mentions: allMentions
            }, {
                quoted: message
            });
        } catch (e) {
            console.error('[EVAL] Send error:', e.message);
        }
    }
};
