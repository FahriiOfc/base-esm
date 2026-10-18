// lib/commandLoader.js
// Dynamic Command Loader

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import commandManager from './commandManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.dirname(__dirname);
const COMMAND_DIR = path.join(PROJECT_ROOT, 'plugins');

export class CommandLoader {
    #commands = new Map();      // name → command object
    #aliases = new Map();       // alias → name
    #fileMap = new Map();       // filePath → name
    #categories = new Map();    // category → Set(name)

    // ============================================================
    // SCAN COMMANDS
    // ============================================================

    async scanCommands() {
        console.log('[COMMAND] Scanning commands...');
        this.#commands.clear();
        this.#aliases.clear();
        this.#fileMap.clear();
        this.#categories.clear();

        await this.#scanDirectory(COMMAND_DIR);
        console.log(`[COMMAND] Loaded ${this.#commands.size} commands`);
    }

    async #scanDirectory(dir, category = null) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    await this.#scanDirectory(fullPath, entry.name);
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                    await this.#loadCommandFile(fullPath);
                }
            }
        } catch (error) {
            console.error('[COMMAND SCAN ERROR]', error.message);
        }
    }

    // ============================================================
    // LOAD COMMAND FILE
    // ============================================================

    async #loadCommandFile(filePath) {
        try {
            const relative = path.relative(COMMAND_DIR, filePath);
            const parts = relative.split(path.sep);
            const category = parts.length > 1 ? parts[0] : 'unknown';

            const fileUrl = pathToFileURL(filePath);
            const importUrl = `${fileUrl.href}?t=${Date.now()}`;
            const module = await import(importUrl);

            const command = module.default;
            if (!command || typeof command.execute !== 'function') {
                console.warn(`[COMMAND] Invalid command: ${filePath}`);
                return;
            }

            if (!command.name) {
                console.warn(`[COMMAND] Missing name: ${filePath}`);
                return;
            }

            if (commandManager.isDisabled(command.name)) {
                console.log(`[COMMAND] ⏭️ Skipping disabled command: ${command.name}`);
                return;
            }

            command.ownerOnly = command.ownerOnly || false;
            command.adminOnly = command.adminOnly || false;
            command.botAdmin = command.botAdmin || false;
            command.groupOnly = command.groupOnly || false;
            command.premiumOnly = command.premiumOnly || false;
            command.category = command.category || category;

            this.#registerCommand(command, filePath, category);

        } catch (error) {
            console.error(`[COMMAND] Failed to load ${filePath}:`, error.message);
        }
    }

    // ============================================================
    // REGISTER COMMAND
    // ============================================================

    #registerCommand(command, filePath, category) {
        const name = command.name;

        if (this.#commands.has(name)) {
            this.#unregisterCommand(name);
        }

        this.#commands.set(name, { ...command, filePath });
        this.#fileMap.set(filePath, name);

        if (!this.#categories.has(category)) {
            this.#categories.set(category, new Set());
        }
        this.#categories.get(category).add(name);

        if (Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
                this.#aliases.set(alias, name);
            }
        }

        console.log(`[COMMAND] Loaded: ${name} (${category})`);
    }

    #unregisterCommand(name) {
        const command = this.#commands.get(name);
        if (!command) return;

        if (Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
                this.#aliases.delete(alias);
            }
        }

        const catSet = this.#categories.get(command.category);
        if (catSet) {
            catSet.delete(name);
        }

        this.#fileMap.delete(command.filePath);
        this.#commands.delete(name);
    }

    // ============================================================
    // GET COMMANDS
    // ============================================================

    getCommand(name) {
        if (this.#commands.has(name)) {
            return this.#commands.get(name);
        }

        const realName = this.#aliases.get(name);
        if (realName && this.#commands.has(realName)) {
            return this.#commands.get(realName);
        }

        return null;
    }

    getCommands() {
        return this.#commands;
    }

    getCategories() {
        return Array.from(this.#categories.keys()).sort();
    }

    getCommandsByCategory(category) {
        const names = this.#categories.get(category);
        if (!names) return [];
        const result = [];
        for (const name of names) {
            const cmd = this.#commands.get(name);
            if (cmd) result.push(cmd);
        }
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }

    getAllCommandsWithDetails() {
        const result = [];
        for (const [name, cmd] of this.#commands) {
            result.push({
                name: cmd.name,
                aliases: cmd.aliases || [],
                category: cmd.category || 'unknown',
                description: cmd.description || '',
                filePath: cmd.filePath || '',
                ownerOnly: cmd.ownerOnly || false,
                adminOnly: cmd.adminOnly || false,
                groupOnly: cmd.groupOnly || false,
                botAdmin: cmd.botAdmin || false
            });
        }
        return result.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    }

    // ============================================================
    // DYNAMIC OPERATIONS
    // ============================================================

    async addCommand(filePath, source) {
        const validatedPath = this.#validatePath(filePath);

        await fs.writeFile(validatedPath, source, 'utf8');
        console.log('[ADDCMD] File saved:', validatedPath);

        await this.#loadCommandFile(validatedPath);

        const name = this.#fileMap.get(validatedPath);
        return { success: true, path: validatedPath, name };
    }

    async removeCommand(filePath) {
        const fullPath = this.#validatePath(filePath);

        const name = this.#fileMap.get(fullPath);
        if (!name) {
            throw new Error(`Command not found: ${filePath}`);
        }

        this.#unregisterCommand(name);

        await fs.unlink(fullPath);
        console.log('[DELCMD] File deleted:', fullPath);

        return { success: true, name };
    }

    async getCommandSource(filePath) {
        const fullPath = this.#validatePath(filePath);

        try {
            await fs.access(fullPath);
        } catch {
            throw new Error(`File not found: ${filePath}`);
        }

        const source = await fs.readFile(fullPath, 'utf8');
        return { path: fullPath, source };
    }

    async reloadCommand(filePath) {
        const fullPath = this.#validatePath(filePath);

        const name = this.#fileMap.get(fullPath);
        if (name) {
            this.#unregisterCommand(name);
        }

        await this.#loadCommandFile(fullPath);

        const newName = this.#fileMap.get(fullPath);
        return { success: true, name: newName };
    }

    // ============================================================
    // VALIDATION
    // ============================================================

    #validatePath(filePath) {
        const normalized = path.normalize(filePath);
        const fullPath = path.resolve(PROJECT_ROOT, normalized);

        if (!fullPath.startsWith(COMMAND_DIR)) {
            throw new Error('Path must be inside plugins/ directory');
        }

        if (!fullPath.endsWith('.js')) {
            throw new Error('File must have .js extension');
        }

        return fullPath;
    }

    // ============================================================
    // GET STATS
    // ============================================================

    getStats() {
        const categories = this.getCategories();
        const total = this.#commands.size;
        const byCategory = {};

        for (const cat of categories) {
            byCategory[cat] = this.#categories.get(cat).size;
        }

        return { total, categories, byCategory };
    }
}

// ============================================================
// HELPER: pathToFileURL
// ============================================================

function pathToFileURL(filePath) {
    const resolved = path.resolve(filePath);
    return new URL(`file://${resolved}`);
}

export default CommandLoader;
