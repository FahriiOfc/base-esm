// lib/commandManager.js
// Manajemen Enable/Disable Command

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'database', 'disabled_plugins.json');

// ============================================================
// INISIALISASI DATABASE
// ============================================================

function ensureDatabase() {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ disabled: [] }, null, 2));
    }
}

function loadDisabled() {
    ensureDatabase();
    try {
        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        return data.disabled || [];
    } catch {
        return [];
    }
}

function saveDisabled(disabled) {
    ensureDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify({ disabled }, null, 2));
}

// ============================================================
// CRUD OPERATIONS
// ============================================================

function getDisabled() {
    return loadDisabled();
}

function isDisabled(commandName) {
    const disabled = loadDisabled();
    return disabled.includes(commandName);
}

function disableCommand(commandName) {
    const disabled = loadDisabled();
    if (disabled.includes(commandName)) {
        return { success: false, message: `❌ Command *${commandName}* sudah dalam keadaan mati.` };
    }
    disabled.push(commandName);
    saveDisabled(disabled);
    return { success: true, message: `🔴 Command *${commandName}* berhasil dimatikan.` };
}

function enableCommand(commandName) {
    const disabled = loadDisabled();
    const index = disabled.indexOf(commandName);
    if (index === -1) {
        return { success: false, message: `❌ Command *${commandName}* tidak ditemukan dalam daftar mati.` };
    }
    disabled.splice(index, 1);
    saveDisabled(disabled);
    return { success: true, message: `🟢 Command *${commandName}* berhasil dinyalakan kembali.` };
}

function getDisabledList() {
    return loadDisabled();
}

// ============================================================
// FILTER COMMANDS UNTUK MENU
// ============================================================

function filterDisabledCommands(commands) {
    const disabled = loadDisabled();
    return commands.filter(cmd => !disabled.includes(cmd.name));
}

function isCommandDisabled(commandName) {
    return isDisabled(commandName);
}

// ============================================================
// EXPORT
// ============================================================

export default {
    getDisabled,
    isDisabled,
    disableCommand,
    enableCommand,
    getDisabledList,
    filterDisabledCommands,
    isCommandDisabled
};
