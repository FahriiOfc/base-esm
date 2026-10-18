// lib/ownerManager.js
// Owner Management System

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'database', 'owners.json');

// ============================================================
// INISIALISASI DATABASE
// ============================================================

function ensureDatabase() {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ owners: [] }, null, 2));
    }
}

function loadOwners() {
    ensureDatabase();
    try {
        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        return data.owners || [];
    } catch {
        return [];
    }
}

function saveOwners(owners) {
    ensureDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify({ owners }, null, 2));
}

// ============================================================
// CRUD OPERATIONS
// ============================================================

function getOwners() {
    return loadOwners();
}

function addOwner(number) {
    const cleaned = String(number).replace(/\D/g, '');
    if (!cleaned || cleaned.length < 6) return { success: false, message: '❌ Nomor tidak valid' };
    
    const owners = loadOwners();
    if (owners.includes(cleaned)) {
        return { success: false, message: `❌ Nomor ${cleaned} sudah terdaftar sebagai owner` };
    }
    
    owners.push(cleaned);
    saveOwners(owners);
    return { success: true, message: `✅ ${cleaned} berhasil ditambahkan sebagai owner`, owners };
}

function removeOwner(number) {
    const cleaned = String(number).replace(/\D/g, '');
    if (!cleaned) return { success: false, message: '❌ Nomor tidak valid' };
    
    const owners = loadOwners();
    const index = owners.indexOf(cleaned);
    if (index === -1) {
        return { success: false, message: `❌ Nomor ${cleaned} tidak ditemukan dalam daftar owner` };
    }
    
    owners.splice(index, 1);
    saveOwners(owners);
    return { success: true, message: `✅ ${cleaned} berhasil dihapus dari daftar owner`, owners };
}

function setOwners(numbers) {
    const cleaned = numbers.map(n => String(n).replace(/\D/g, '')).filter(n => n.length >= 6);
    if (cleaned.length === 0) {
        return { success: false, message: '❌ Tidak ada nomor valid' };
    }
    saveOwners(cleaned);
    return { success: true, message: `✅ Daftar owner berhasil diupdate (${cleaned.length} owner)`, owners: cleaned };
}

function isOwner(jid) {
    const cleaned = String(jid).replace(/\D/g, '');
    const owners = loadOwners();
    return owners.includes(cleaned);
}

// ============================================================
// GENERATE VCARD UNTUK MULTIPLE OWNER
// ============================================================

function generateOwnerVcards(owners, botName = 'FarrMdV1') {
    if (!owners || owners.length === 0) return null;
    
    return owners.map((number, index) => {
        let displayName;
        if (owners.length === 1) {
            displayName = `${botName} - Owner`;
        } else if (index === 0) {
            displayName = `${botName} - Owner (Primary)`;
        } else {
            displayName = `${botName} - Owner ${index + 1}`;
        }
        
        return {
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:${displayName}
N:${displayName};;;;
TEL;type=CELL;type=VOICE;waid=${number}:+${number}
END:VCARD`
        };
    });
}

// ============================================================
// EXPORT
// ============================================================

export default {
    getOwners,
    addOwner,
    removeOwner,
    setOwners,
    isOwner,
    generateOwnerVcards
};