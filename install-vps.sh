#!/usr/bin/env bash
# ============================================================
# FarrMdV2 — Debian/Ubuntu VPS Installer (Clean & Safe)
# ============================================================
set -e

# Pastikan dijalankan sebagai root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Jalankan sebagai root atau pakai sudo."
    exit 1
fi

# Pastikan script dijalankan di dalam folder project (ada package.json)
if [ ! -f "package.json" ]; then
    echo "❌ File package.json tidak ditemukan!"
    echo "   Pastikan Anda menjalankan script ini di dalam folder project FarrMdV2."
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

# ---------- 4. BUILD TOOLS (Wajib untuk kompilasi modul native seperti sharp) ----------
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
    echo "   Node.js belum terinstall. Menginstall..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
else
    # Mengambil angka versi utama dari output 'node -v' (contoh: v22.1.0 -> 22)
    NODE_MAJOR=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    
    if [ "$NODE_MAJOR" -ne 22 ]; then
        echo "   ⚠️  Node v$NODE_MAJOR terdeteksi. Menginstall Node 22..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt install -y nodejs
    else
        echo "   ✅ Node.js 22 sudah terinstall."
    fi
fi

echo ""
echo "Versi Node & NPM saat ini:"
node -v
npm -v

# ---------- 6. NPM INSTALL ----------
echo ""
echo "[5/5] Install npm dependencies..."
if [ -d "node_modules" ]; then
    echo "   ⏭️  node_modules sudah ada, skip install."
else
    echo "   ⏳ Menjalankan npm install (mohon tunggu)..."
    npm install --no-audit --no-fund
fi

echo ""
echo "================================================"
echo "   ✅ INSTALL BERHASIL"
echo "================================================"
echo ""
echo "Cara menjalankan bot:"
echo "   npm start          # Jalankan bot"
echo "   npm run dev        # Mode development"
echo ""
echo "💡 Tips Production (PM2):"
echo "   npm install -g pm2"
echo "   pm2 start ecosystem.config.cjs"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
