# FarrMdV2 - WhatsApp Bot (ESM Architecture)

> **Base WhatsApp Bot minimalis, stabil, dan siap production.**
> Dibangun dengan Node.js (ESM) dan Baileys versi terbaru.

---

## 👑 Creator & Ownership

Project ini **100% original** dan dikembangkan oleh:

- **Creator / Owner**: FarrDev (FarrMd)
- **WhatsApp**: [Disini](https://wa.me/62882002653075)
- **Base Version**: v2.0.0

**Hak Cipta & Lisensi:**
Seluruh kode inti (Core Architecture, Handler, Message Builder, ESM implementation) adalah milik creator. 
Dilarang memperjualbelikan base ini tanpa izin tertulis dari creator. Anda diperbolehkan menggunakan, memodifikasi, dan mengembangkan untuk keperluan pribadi maupun komersial (bot pribadi), namun **wajib menyertakan credit** kepada creator asli.

---

## ✨ Fitur Utama

- ✅ **ESM Architecture** - Menggunakan `import/export` modern Node.js.
- ✅ **Baileys Latest (v7)** - Support media type terbaru dan native flow button.
- ✅ **Custom Pairing Code** - Login tanpa scan QR (menggunakan kode 8 digit).
- ✅ **Modular Command Loader** - Plugin otomatis diload dari folder `plugins/`.
- ✅ **Auto Reconnect** - Sistem reconnect cerdas (tidak mudah mati saat koneksi drop).
- ✅ **Keep-Alive Singleton** - Mencegah memory leak saat bot berjalan lama.
- ✅ **Custom Prefix** - Support prefix spesial seperti `=>` (eval) dan `$` (shell).
- ✅ **Message Builder** - Support Native Flow, List, Carousel, dan AIRich.

---

## 📂 Struktur Folder

```text
FarrMdV2/
├── lib/                  # Library inti (handler, serializer, dll)
├── plugins/              # Folder command/plugin (otomatis diload)
│   ├── main/             # Command utama (menu, owner, runtime, ping)
│   ├── owner/            # Command khusus owner (shell, eval, test)
│   └── ...               # jika ingin menambahkan plugins, buat saja folder kategorinya
├── database/             # File JSON (settings, premium, dll)
├── config.js             # File konfigurasi bot
├── handler.js            # Message dispatcher
├── index.js              # Entry point (koneksi Baileys)
└── package.json          # Dependencies
```

---

🚀 Tutorial Install: VPS (Ubuntu/Debian) 
-
Panduan ini cocok untuk VPS yang belum memiliki Node.js atau Git sama sekali.

```bash
apt update && apt upgrade -y
apt install -y curl wget git zip unzip build-essential python3
curl -fsSL https://deb.nodesource.com/setup_22.x | -E bash -
apt install -y nodejs
```
Verifikasi instalasi nodejs:
```
node -v 
npm -v
```
Clone repository ini, masuk ke foldernya, lalu install dependencies:
```bash
git clone https://github.com/FahriiOfc/base-esm.git
cd base-esm
npm install
npm start
```

Atau jika anda menggunakan PC/Laptop untuk tes koneksi, anda bisa menggunakan command diatas, namun pastikan untuk menginstall ketiga paket ini :

- [Nodejs](https://nodejs.org/en/download/current): Disarankan menggunakan V.22 LTS, atau bisa juga V24 LTS.
  pilih installer .msi, dan lakukan installasi sampai selesai. klick next saja sampai selesai. untuk memastikan nodejs berjalan dan sesuai dengan versinya, cek di CMD baru dengan:
```bash
node -v
npm -v
```
- [ffmpeg](https://www.gyan.dev/ffmpeg/builds/): Geser kebawah sampai bertemu latest release, dan pilih ffmpeg-release-full. jika anda kesulitan, bisa langsung klick tautan [disini](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-full.7z) untuk installasi.
Jika sudah selesai. Extract file .zip ke folder C:\\ffmpeg dan pastikan ada folder bernama bin

Cara Memasukkan FFmpeg ke Environment Variables Windows (Wajib):
1. Tekan tombol Windows + R, ketik sysdm.cpl, lalu Enter.
2. Pilih tab Advanced > klik tombol Environment Variables.
3. Di bagian System variables, cari variabel bernama Path (atau PATH), lalu klik Edit.
4. Klik New, lalu masukkan path folder bin tempat Anda mengextract FFmpeg tadi (Contoh: C:\ffmpeg\bin).
5. Klik OK di semua jendela.
Untuk verifikasi, buka CMD baru dan mengetik
```bash
ffmpeg -version
```


Edit file [config.js](https://github.com/FahriiOfc/base-esm/blob/main/config.js)
 untuk menyesuaikan nama bot, nomor owner, dan prefix.

Saat pertama kali berjalan, bot akan meminta nomor WhatsApp. Masukkan nomor (contoh: 628xxx) lalu masukkan 8-digit Pairing Code yang muncul ke WhatsApp Anda (Perangkat Tertaut).

---

📱 Tutorial Install: Termux (Android)
-
1. Update & Install Dependencies

Buka Termux, lalu jalankan:

```bash
pkg update && pkg upgrade -y
pkg install -y nodejs-lts git ffmpeg libwebp python make clang pkg-config
git clone https://github.com/FahriiOfc/base-esm.git
cd base-esm
npm install
npm start
```
---

⚙️ Cara Menjalankan Bot 24/7 (Production)
-
Jika Anda menggunakan VPS, sangat disarankan menggunakan PM2 agar bot otomatis restart jika crash atau VPS reboot.

1. Install PM2 (Global)

```bash
sudo npm install -g pm2
```

2. Jalankan Bot dengan PM2

```bash
pm2 start index.js --name "name"
```

3. Simpan Status & Auto-Start saat Reboot

```bash
pm2 save && pm2 startup
```
---

⚠️ Catatan Penting

· Jangan pernah membagikan folder auth/ (berisi session WhatsApp Anda). Folder ini sudah otomatis masuk ke .gitignore.
· Bot ini tidak disarankan untuk spam/blast massal. Gunakan dengan bijak agar nomor tidak dibanned oleh WhatsApp.
· Jika Anda melakukan perubahan pada file .js, gunakan perintah .reload via WhatsApp atau restart bot (npm start / pm2 restart base-esm).

---

🤝 Kontribusi & Dukungan

Jika Anda menemukan bug atau ingin menambahkan fitur, silakan buat Pull Request atau hubungi creator langsung via [WhatsApp](wa.me/62882002653075)

© 2025 FarrDev - All Rights Reserved.

```
