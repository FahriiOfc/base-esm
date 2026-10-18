# FarrMdV2 - WhatsApp Bot (ESM Architecture)

> **Base WhatsApp Bot minimalis, stabil, dan siap production.**
> Dibangun dengan Node.js (ESM) dan Baileys versi terbaru.

---

## 👑 Creator & Ownership

Project ini **100% original** dan dikembangkan oleh:

- **Creator / Owner**: FarrDev (FarrMd)
- **WhatsApp**: [+62 858-9302-8915](https://wa.me/6285893028915)
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
│   ├── main/             # Command utama (menu, owner, runtime)
│   ├── owner/            # Command khusus owner (shell, eval, test)
│   ├── tools/            # Command tools (ping, dll)
│   └── ...
├── database/             # File JSON (settings, premium, dll)
├── auth/                 # Folder session WhatsApp (JANGAN DI-COMMIT)
├── config.js             # File konfigurasi bot
├── handler.js            # Message dispatcher
├── index.js              # Entry point (koneksi Baileys)
└── package.json          # Dependencies
