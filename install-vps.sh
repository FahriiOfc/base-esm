#!/usr/bin/env bash
# ============================================================
# FarrMdV2 — Debian/Ubuntu VPS Installer (Minimal)
# ============================================================
set -e

if [ "$EUID" -ne 0 ]; then
    echo "❌ Jalankan sebagai root atau pakai sudo."
    exit 1
fi

echo ""
echo "================================================"
echo "   FarrMdV2 — VPS Installer"
echo "================================================"
echo ""

# ---------- 1. DETECT DISTRO ----------
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "[INFO] Distro: $PRETTY_NAME"
else
    echo "[ERROR] Tidak bisa deteksi distro."
    exit 1
fi

# ---------- 2. UPDATE ----------
echo ""
echo "[1/4] Update package list..."
apt update -y

# ---------- 3. BASIC TOOLS ----------
echo ""
echo "[2/4] Install basic tools..."
apt install -y \
    curl \
    wget \
    git \
    zip \
    unzip

# ---------- 4. BUILD TOOLS (untuk better-sqlite3 / sharp fallback) ----------
echo ""
echo "[3/4] Install build tools..."
apt install -y \
    python3 \
    make \
    g++ \
    build-essential

# ---------- 5. NODE 22 ----------
echo ""
echo "[4/4] Install Node.js 22 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
else
    NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -ne 22 ]; then
        echo "   ⚠️  Node $NODE_MAJOR terdeteksi, install Node 22..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt install -y nodejs
    fi
fi

node -v
npm -v

# ---------- 6. NPM INSTALL ----------
echo ""
echo "Install npm dependencies..."
if [ -d "node_modules" ]; then
    echo "   node_modules sudah ada, skip."
else
    npm install --no-audit --no-fund
fi

echo ""
echo "================================================"
echo "   ✅ INSTALL BERHASIL"
echo "================================================"
echo ""
echo "Cara menjalankan:"
echo "   npm start          # jalankan bot"
echo "   npm run dev        # mode development"
echo ""
echo "PM2 (OPSIONAL):"
echo "   npm install -g pm2"
echo "   pm2 start ecosystem.config.cjs"
echo "   pm2 save"
echo ""