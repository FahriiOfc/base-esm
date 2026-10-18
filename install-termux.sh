#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# FarrMdV2 — Termux Installer (Clean & Sticker-Ready)
# ============================================================
set -e

echo ""
echo "================================================"
echo "   FarrMdV2 — Termux Installer"
echo "================================================"
echo ""

# ---------- 1. VERIFIKASI NODE.JS ----------
echo "[1/5] Cek Node.js & NPM..."
if ! command -v node &> /dev/null; then
    echo "   ❌ Node.js tidak ditemukan! Silakan install manual."
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo "   ✅ Node version: $NODE_VERSION"
echo "   ✅ NPM version : $NPM_VERSION"

# ---------- 2. CEK DEPENDENSI STICKER (WAJIB) ----------
echo ""
echo "[2/5] Cek dependensi fitur Sticker (FFmpeg & WebP)..."
if ! command -v ffmpeg &> /dev/null; then
    echo "   ❌ FFmpeg tidak ditemukan! Fitur sticker/video akan gagal."
    echo "   👉 Jalankan: pkg install ffmpeg"
    exit 1
fi

if ! pkg list-installed 2>/dev/null | grep -q libwebp; then
    echo "   ❌ libwebp tidak ditemukan! Fitur sticker akan gagal."
    echo "   👉 Jalankan: pkg install libwebp"
    exit 1
fi
echo "   ✅ FFmpeg & libwebp terdeteksi."

# ---------- 3. CEK BUILD TOOLS (UNTUK NATIVE MODULE) ----------
echo ""
echo "[3/5] Cek Build Tools (Sharp/Node Native)..."
MISSING=0
for tool in python make clang pkg-config; do
    if ! command -v $tool &> /dev/null; then
        echo "   ⚠️  $tool tidak ditemukan."
        MISSING=1
    fi
done

if [ "$MISSING" -eq 1 ]; then
    echo ""
    echo "   ⚠️  Build tools belum lengkap. Fitur 'sharp' (image resizer) mungkin gagal di-compile."
    echo "   👉 Sangat disarankan jalankan: pkg install python make clang pkg-config"
    echo "   (Script akan tetap lanjut, tapi risiko npm install gagal tinggi)."
    sleep 3
else
    echo "   ✅ Build tools lengkap."
fi

# ---------- 4. NPM CONFIG ----------
echo ""
echo "[4/5] Konfigurasi npm..."
npm config set fund false
npm config set audit false

if command -v python &> /dev/null; then
    npm config set python python
fi

# Fix untuk Termux
export GYP_DEFINES="android_ndk_path=''"

# ---------- 5. NPM INSTALL ----------
echo ""
echo "[5/5] Install dependencies (Node.js)..."
if [ -d "node_modules" ]; then
    echo "   ⏭️  node_modules sudah ada. Skip."
    echo "      (Jika ada error, hapus folder node_modules lalu jalankan ulang script ini)."
else
    echo "   ⏳ Menjalankan npm install (butuh koneksi internet & waktu)..."
    npm install --no-audit --no-fund
fi

# ---------- SELESAI ----------
echo ""
echo "================================================"
echo "   ✅ INSTALL SELESAI"
echo "================================================"
echo ""
echo "Cara menjalankan bot:"
echo "   npm start"
echo ""
echo "Tips Termux:"
echo "   termux-wake-lock"
echo "   nohup npm start > bot.log 2>&1 &"
echo ""
