# PWA Setup - Parkir Binus

Progressive Web App sudah dikonfigurasi untuk aplikasi Parkir Binus. Pengguna dapat meng-install aplikasi seperti aplikasi native di perangkat mereka.

## Fitur PWA

### 1. Install Prompt
- Otomatis muncul setelah 3 detik untuk pengguna pertama kali
- Mendukung Android, Desktop Chrome/Edge, dan iOS Safari
- Tombol "Install Sekarang" untuk Android/Desktop
- Instruksi manual untuk iOS (Share → Add to Home Screen)
- Tidak akan muncul lagi setelah user dismiss atau sudah install

### 2. Offline Support
- Cache-first strategy untuk static assets (JS, CSS, images)
- Network-first untuk API calls dengan fallback ke cache
- Halaman offline khusus ketika tidak ada koneksi
- Service worker otomatis update dengan versioning cache

### 3. App Shortcuts
Di home screen Android, long-press icon untuk:
- Scan QR - langsung buka scanner
- Wallet - langsung buka halaman wallet

### 4. Push Notifications
Service worker mendukung push notifications via postMessage:
```javascript
navigator.serviceWorker.controller.postMessage({
  type: 'NOTIFY',
  title: 'Parkir Binus',
  body: 'Session Anda akan berakhir dalam 5 menit',
  tag: 'session-ending'
});
```

## Files Structure

```
public/
├── manifest.json          # PWA manifest
├── icon.svg               # Main app icon (SVG)
├── apple-icon.svg         # Apple touch icon
├── sw.js                  # Service worker
└── icons/
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    ├── icon-512x512.png
    ├── scan-shortcut.png
    └── wallet-shortcut.png

src/
├── app/
│   ├── layout.tsx         # Root layout with PWA setup
│   └── offline/
│       └── page.tsx       # Offline fallback page
└── components/pwa/
    ├── ServiceWorkerRegistration.tsx
    └── PWAInstallPrompt.tsx
```

## Testing

### Local Testing
1. Jalankan dev server: `npm run dev`
2. Buka di Chrome/Edge: `http://localhost:3000`
3. Buka DevTools → Application → Manifest
4. Klik "Add to home screen" atau install prompt

### Lighthouse Audit
Jalankan Lighthouse audit di Chrome DevTools:
1. DevTools → Lighthouse
2. Pilih "Progressive Web App"
3. Run audit

Target score: 100% PWA compliance

## Regenerate Icons

Jika ingin mengubah icon, edit SVG di `scripts/generate-icons.mjs` lalu:

```bash
node scripts/generate-icons.mjs
```

## Production Deployment

PWA berfungsi penuh di production dengan HTTPS. Pastikan:
1. Server menggunakan HTTPS
2. Service worker ter-registrasi dengan benar
3. Manifest.json accessible di `/manifest.json`
4. Icons tersedia di `/icons/`

## Browser Support

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Install Prompt | ✅ | iOS only* | ❌ | ✅ |
| Offline Support | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ❌ | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |

*iOS: Manual install via Share → Add to Home Screen
