// lib/premium.js
// Manajemen Premium User

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'database', 'premium.json');

// ============================================================
// INISIALISASI DATABASE
// ============================================================

function ensureDatabase() {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2));
    }
}

function loadPremium() {
    ensureDatabase();
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {
        return { users: {} };
    }
}

function savePremium(data) {
    ensureDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ============================================================
// FORMAT DURASI
// ============================================================

function formatDuration(ms) {
    if (!ms || ms <= 0) return '0 menit';
    
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days} hari`);
    if (hours > 0) parts.push(`${hours} jam`);
    if (minutes > 0) parts.push(`${minutes} menit`);
    
    return parts.join(' ') || '0 menit';
}

function formatDurationShort(ms) {
    if (!ms || ms <= 0) return '0m';
    
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '0m';
}

// ============================================================
// CRUD OPERATIONS
// ============================================================

function isPremium(jid) {
    const cleaned = String(jid).replace(/\D/g, '');
    if (!cleaned) return false;
    
    const db = loadPremium();
    const user = db.users[cleaned];
    if (!user) return false;
    
    // Cek expired
    if (user.expiresAt && Date.now() > user.expiresAt) {
        removePremium(cleaned);
        return false;
    }
    
    return true;
}

function getPremiumInfo(jid) {
    const cleaned = String(jid).replace(/\D/g, '');
    if (!cleaned) return null;
    
    const db = loadPremium();
    const user = db.users[cleaned];
    if (!user) return null;
    
    // Cek expired
    if (user.expiresAt && Date.now() > user.expiresAt) {
        removePremium(cleaned);
        return null;
    }
    
    return user;
}

// ============================================================
// ADD PREMIUM - TAMBAH DURASI (FIX)
// ============================================================

function addPremium(jid, durationMinutes, addedBy) {
    const cleaned = String(jid).replace(/\D/g, '');
    if (!cleaned || cleaned.length < 6) {
        return { success: false, message: '❌ Nomor tidak valid' };
    }
    
    if (durationMinutes < 1) {
        return { success: false, message: '❌ Durasi minimal 1 menit' };
    }
    
    const db = loadPremium();
    const now = Date.now();
    const durationMs = durationMinutes * 60 * 1000;
    
    // ✅ CEK APAKAH USER SUDAH ADA
    if (db.users[cleaned]) {
        // User sudah ada → tambah durasi
        const existing = db.users[cleaned];
        const newExpiresAt = existing.expiresAt + durationMs;
        
        db.users[cleaned] = {
            ...existing,
            expiresAt: newExpiresAt,
            duration: existing.duration + durationMinutes,
            addedBy: String(addedBy).replace(/\D/g, '') // Update addedBy
        };
        
        savePremium(db);
        
        return {
            success: true,
            message: `✅ +${cleaned} durasi ditambah ${formatDuration(durationMs)}!\n` +
                     `📅 Total sekarang: ${formatDuration(newExpiresAt - now)}`
        };
    }
    
    // User belum ada → buat baru
    const expiresAt = now + durationMs;
    db.users[cleaned] = {
        addedBy: String(addedBy).replace(/\D/g, ''),
        addedAt: now,
        expiresAt: expiresAt,
        duration: durationMinutes
    };
    
    savePremium(db);
    
    return {
        success: true,
        message: `✅ ${cleaned} sekarang Premium!\n📅 Durasi: ${formatDuration(durationMs)}`
    };
}

function removePremium(jid) {
    const cleaned = String(jid).replace(/\D/g, '');
    if (!cleaned) {
        return { success: false, message: '❌ Nomor tidak valid' };
    }
    
    const db = loadPremium();
    if (!db.users[cleaned]) {
        return { success: false, message: `❌ ${cleaned} bukan user premium` };
    }
    
    delete db.users[cleaned];
    savePremium(db);
    
    return { success: true, message: `✅ ${cleaned} berhasil dihapus dari premium` };
}

// ============================================================
// REDUCE PREMIUM - KURANGI DURASI (FITUR BARU)
// ============================================================

function reducePremium(jid, durationMinutes) {
    const cleaned = String(jid).replace(/\D/g, '');
    if (!cleaned || cleaned.length < 6) {
        return { success: false, message: '❌ Nomor tidak valid' };
    }
    
    if (durationMinutes < 1) {
        return { success: false, message: '❌ Durasi minimal 1 menit' };
    }
    
    const db = loadPremium();
    if (!db.users[cleaned]) {
        return { success: false, message: `❌ ${cleaned} bukan user premium` };
    }
    
    const user = db.users[cleaned];
    const durationMs = durationMinutes * 60 * 1000;
    const newExpiresAt = user.expiresAt - durationMs;
    
    // ✅ Jika durasi habis atau kurang dari 0 → hapus user
    if (newExpiresAt <= Date.now()) {
        delete db.users[cleaned];
        savePremium(db);
        return {
            success: true,
            message: `✅ ${cleaned} expired! Durasi habis dikurangi ${formatDuration(durationMs)}.`
        };
    }
    
    // Update durasi
    db.users[cleaned] = {
        ...user,
        expiresAt: newExpiresAt,
        duration: user.duration - durationMinutes
    };
    
    savePremium(db);
    
    return {
        success: true,
        message: `✅ +${cleaned} durasi dikurangi ${formatDuration(durationMs)}!\n` +
                 `📅 Sisa: ${formatDuration(newExpiresAt - Date.now())}`
    };
}

function listPremium() {
    const db = loadPremium();
    const users = db.users || {};
    const now = Date.now();
    
    const list = [];
    for (const [number, data] of Object.entries(users)) {
        // Skip expired
        if (data.expiresAt && now > data.expiresAt) {
            removePremium(number);
            continue;
        }
        
        const remaining = data.expiresAt ? data.expiresAt - now : 0;
        list.push({
            number,
            remainingMs: remaining,
            remaining: formatDuration(remaining),
            remainingShort: formatDurationShort(remaining),
            addedBy: data.addedBy,
            addedAt: data.addedAt,
            duration: data.duration
        });
    }
    
    // Urutkan dari yang paling lama tersisa
    list.sort((a, b) => b.remainingMs - a.remainingMs);
    
    return list;
}

function getStats() {
    const list = listPremium();
    const total = list.length;
    const expired = Object.keys(loadPremium().users || {}).length - total;
    
    return { total, expired, list };
}

// ============================================================
// EXPORT
// ============================================================

export default {
    isPremium,
    getPremiumInfo,
    addPremium,
    removePremium,
    reducePremium,
    listPremium,
    getStats,
    formatDuration,
    formatDurationShort
};