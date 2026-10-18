// lib/database.js
// Centralized JSON Database Operations

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeJid } from './identity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_DIR = path.join(__dirname, '..', 'database');

// ============================================================
// ENSURE DATABASE
// ============================================================

function ensureDatabaseDir() {
    if (!fs.existsSync(DATABASE_DIR)) {
        fs.mkdirSync(DATABASE_DIR, { recursive: true });
    }
}

function ensureFile(filePath, defaultData) {
    ensureDatabaseDir();
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
}

// ============================================================
// GENERIC DB OPERATIONS
// ============================================================

function readJSON(filePath, defaultData = {}) {
    ensureFile(filePath, defaultData);
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return defaultData;
    }
}

function writeJSON(filePath, data) {
    ensureDatabaseDir();
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('[DB WRITE ERROR]', error?.message || error);
        return false;
    }
}

// ============================================================
// BLACKLIST GRUP
// ============================================================

const BL_GRUP_FILE = path.join(DATABASE_DIR, 'blacklist_grup.json');

function getBlGrup() {
    return readJSON(BL_GRUP_FILE, { groups: [] });
}

function setBlGrup(data) {
    return writeJSON(BL_GRUP_FILE, data);
}

function isBlGrup(jid) {
    const db = getBlGrup();
    const normalized = normalizeJid(jid);
    return db.groups.includes(normalized);
}

function addBlGrup(jid) {
    const db = getBlGrup();
    const normalized = normalizeJid(jid);
    if (!db.groups.includes(normalized)) {
        db.groups.push(normalized);
        return setBlGrup(db);
    }
    return false;
}

function removeBlGrup(jid) {
    const db = getBlGrup();
    const normalized = normalizeJid(jid);
    const index = db.groups.indexOf(normalized);
    if (index !== -1) {
        db.groups.splice(index, 1);
        return setBlGrup(db);
    }
    return false;
}

// ============================================================
// BLACKLIST USER
// ============================================================

const BL_USER_FILE = path.join(DATABASE_DIR, 'blacklist_user.json');

function getBlUser() {
    return readJSON(BL_USER_FILE, { users: [] });
}

function setBlUser(data) {
    return writeJSON(BL_USER_FILE, data);
}

function isBlUser(jid) {
    const db = getBlUser();
    const normalized = normalizeJid(jid);
    return db.users.includes(normalized);
}

function addBlUser(jid) {
    const db = getBlUser();
    const normalized = normalizeJid(jid);
    if (!db.users.includes(normalized)) {
        db.users.push(normalized);
        return setBlUser(db);
    }
    return false;
}

function removeBlUser(jid) {
    const db = getBlUser();
    const normalized = normalizeJid(jid);
    const index = db.users.indexOf(normalized);
    if (index !== -1) {
        db.users.splice(index, 1);
        return setBlUser(db);
    }
    return false;
}

// ============================================================
// MUTE - FIXED
// ============================================================

const MUTE_FILE = path.join(DATABASE_DIR, 'mute.json');

function getMute() {
    return readJSON(MUTE_FILE, { groups: {} });
}

function setMute(data) {
    return writeJSON(MUTE_FILE, data);
}

function isMuted(jid, userJid) {
    const db = getMute();
    const normalizedJid = normalizeJid(jid);
    const normalizedUser = normalizeJid(userJid);
    const users = db?.groups?.[normalizedJid]?.users || [];
    return users.some(u => normalizeJid(u) === normalizedUser);
}

function addMute(jid, userJid) {
    const db = getMute();
    const normalizedJid = normalizeJid(jid);
    const normalizedUser = normalizeJid(userJid);
    
    if (!db.groups[normalizedJid]) {
        db.groups[normalizedJid] = { users: [] };
    }
    if (!db.groups[normalizedJid].users.some(u => normalizeJid(u) === normalizedUser)) {
        db.groups[normalizedJid].users.push(normalizedUser);
        return setMute(db);
    }
    return false;
}

function removeMute(jid, userJid) {
    const db = getMute();
    const normalizedJid = normalizeJid(jid);
    const normalizedUser = normalizeJid(userJid);
    
    if (db.groups[normalizedJid]) {
        const index = db.groups[normalizedJid].users.findIndex(u => normalizeJid(u) === normalizedUser);
        if (index !== -1) {
            db.groups[normalizedJid].users.splice(index, 1);
            return setMute(db);
        }
    }
    return false;
}

function getMutedUsers(jid) {
    const db = getMute();
    const normalizedJid = normalizeJid(jid);
    return db?.groups?.[normalizedJid]?.users || [];
}

// ============================================================
// EXPORT
// ============================================================

export {
    readJSON,
    writeJSON,
    getBlGrup,
    setBlGrup,
    isBlGrup,
    addBlGrup,
    removeBlGrup,
    getBlUser,
    setBlUser,
    isBlUser,
    addBlUser,
    removeBlUser,
    getMute,
    setMute,
    isMuted,
    addMute,
    removeMute,
    getMutedUsers
};

export default {
    readJSON,
    writeJSON,
    getBlGrup,
    setBlGrup,
    isBlGrup,
    addBlGrup,
    removeBlGrup,
    getBlUser,
    setBlUser,
    isBlUser,
    addBlUser,
    removeBlUser,
    getMute,
    setMute,
    isMuted,
    addMute,
    removeMute,
    getMutedUsers
};