// lib/settings.js
// Persistent Settings

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_DIR = path.join(__dirname, '..', 'database');
const SETTINGS_FILE = path.join(DATABASE_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
    mode: config.mode || 'public',
    menuStyle: 'listimg',
    autoread: config.autoread ?? true,
    autotyping: config.autotyping ?? true,
    autovn: config.autovn ?? false
};

function init() {
    if (!fs.existsSync(DATABASE_DIR)) {
        fs.mkdirSync(DATABASE_DIR, { recursive: true });
    }
    if (!fs.existsSync(SETTINGS_FILE)) {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 4));
    }
}

function load() {
    init();
    try {
        const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        return { ...DEFAULT_SETTINGS, ...data };
    } catch {
        save(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
    }
}

function save(data) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 4));
}

export default {
    get: load,
    getValue: (key) => load()[key],
    set: (key, value) => {
        const data = load();
        data[key] = value;
        save(data);
        return data;
    },
    save,
    load,
    reset: () => {
        save(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
    }
};