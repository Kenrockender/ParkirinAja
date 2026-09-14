# File-file Penting yang Dimodifikasi - Parkir Binus v3.1

## 🎯 Ringkasan Semua Perubahan

### 1. **ParkingMap.tsx** - Tampilan peta parkir REALISTIS
- ✅ Slot parkir persegi panjang (80px tinggi)
- ✅ Garis kuning (3px) antar mobil di luar kotak
- ✅ Tiang struktural (8px) setiap 3 mobil
- ✅ Lift warna BIRU, WC warna UNGU (lebih menonjol)
- ✅ Tidak ada garis kuning sebelum tiang & di akhir baris

### 2. **HomeView.tsx** - Halaman utama
- ✅ Hapus mini map preview
- ✅ Tampilkan iklan dengan support gambar URL
- ✅ Carousel ads dengan dot indicators
- ✅ Tombol Scan QR dihapus dari konten (pindah ke navbar)

### 3. **page.tsx** - Main app dengan navbar baru
- ✅ **TOMBOL SCAN QR DI NAVBAR TENGAH** (seperti FAB - Floating Action Button)
- ✅ Layout navbar: Home | History | 🔵 SCAN | Wallet | Profile
- ✅ Tombol scan menonjol, elevated, dengan shadow
- ✅ Hapus footer subtitle "Business-foundation prototype"

### 4. **map-page.tsx** - Halaman peta full screen
- ✅ **Bisa di-scroll horizontal** (tidak paksa landscape)
- ✅ Fixed width 1400px untuk peta
- ✅ Hint banner: "💡 Geser ke kanan-kiri untuk melihat semua slot parkir"
- ✅ Ukuran pas untuk mobile

### 5. **HistoryView.tsx** - Riwayat dengan countdown refund
- ✅ **Countdown 10 menit untuk refund 100%**
- ✅ Banner hijau dengan timer di tiap reservasi CONFIRMED
- ✅ Format countdown: `09:45` (menit:detik)
- ✅ Update real-time setiap detik
- ✅ Auto hide setelah 10 menit

### 6. **AdminAds.tsx** - Admin panel iklan
- ✅ Opsi "image" theme untuk custom image URL
- ✅ Input field untuk imageUrl
- ✅ Preview gambar di daftar admin
- ✅ Icon ImageIcon untuk tema image

### 7. **scan-route.ts** - API scan slot
- ✅ **Fix transaksi overtime - pisahkan jadi 2 transaksi:**
  - `PAYMENT` untuk parking fee (20k/30k)
  - `OVERTIME` untuk overtime fee (5k/jam)
- ✅ Tidak ada lagi transaksi gabungan yang membingungkan di history

### 8. **reservation-id-route.ts** - API cancel reservation
- ✅ **Refund logic baru dengan 10 menit grace period**
- ✅ Pass createdAt ke refund calculation

### 9. **parking.ts** - Refund calculation logic
- ✅ **100% refund: Dalam 10 menit setelah booking dibuat**
- ✅ 50% refund: >24 jam sebelum waktu mulai (tetap)
- ✅ 50% refund: ≤24 jam sebelum waktu mulai (tetap)
- ✅ 0% refund: No-show

### 10. **ads-route.ts** - API ads
- ✅ Support imageUrl field
- ✅ Validasi imageTheme termasuk "image"

### 11. **i18n.tsx** - Translasi
- ✅ Update text refund policy (ID & EN)
- ✅ "Dalam 10 menit setelah booking: refund 100%"

### 12. **schema.prisma** - Database schema
- ✅ Tambah field `imageUrl String?` di model Advertisement

---

## 📦 Cara Pakai

### 1. **Database Migration**
```bash
npx prisma migrate dev --name add_imageurl_to_advertisement
npx prisma generate
```

### 2. **Run Development Server**
```bash
npm run dev
```

### 3. **Test Features**
- Buat booking baru → lihat countdown 10 menit di History
- Scan QR dari navbar tengah
- Lihat peta di /map → scroll horizontal
- Upload iklan dengan gambar di admin panel

---

## 🎨 UI/UX Improvements

### **Navbar Bawah (Bottom Navigation)**
```
┌─────────┬──────────┬────────────┬──────────┬─────────┐
│  Home   │ History  │  🔵 SCAN   │  Wallet  │ Profile │
│  icon   │   icon   │   BESAR    │   icon   │  icon   │
└─────────┴──────────┴────────────┴──────────┴─────────┘
```
- Tombol Scan QR di tengah menonjol (56px, elevated -mt-6)
- Warna primary dengan shadow
- Hover & press animations

### **Peta Parkir Visual**
```
[A-01] |kuning| [A-02] |kuning| [A-03] |TIANG| [A-04] ...
  ↑       ↑         ↑        ↑        ↑
 Slot   Garis    Slot    Tiang    Slot
(80px)  (3px)   (80px)   (8px)   (80px)
```

### **Countdown Timer**
```
┌─────────────────────────────────────────┐
│ 💯 Refund 100% berakhir dalam:          │
│    09:45                                │
└─────────────────────────────────────────┘
```

---

## 🔑 Key Features

### ✅ **Refund Policy dengan Countdown**
- 10 menit grace period untuk cancel dengan full refund
- Visual countdown yang jelas
- Fair untuk user yang salah booking

### ✅ **Navbar Modern**
- Center action button (Scan QR)
- Easy access untuk fitur utama
- Professional UI pattern

### ✅ **Peta Realistis**
- Garis kuning seperti marka parkir asli
- Tiang struktural setiap 3 bay
- Lift & WC dengan warna berbeda

### ✅ **Horizontal Scroll Map**
- Tidak paksa landscape
- Natural scrolling behavior
- Mobile-friendly

### ✅ **Iklan Fleksibel**
- Bisa pakai icon theme
- Bisa pakai custom image URL
- Carousel dengan smooth transitions

---

## 📁 File Structure
```
export-for-ai/
├── ParkingMap.tsx              # Peta parkir realistis
├── HomeView.tsx                # Home tanpa mini map
├── HistoryView.tsx             # History + countdown refund
├── page.tsx                    # Main app + navbar FAB
├── map-page.tsx                # Full screen scrollable map
├── AdminAds.tsx                # Admin ads + image support
├── scan-route.ts               # API scan dengan transaksi terpisah
├── reservation-id-route.ts     # API cancel dengan refund baru
├── ads-route.ts                # API ads dengan imageUrl
├── i18n.tsx                    # Translasi updated
├── parking.ts                  # Refund logic dengan 10 min window
├── schema.prisma               # DB schema + imageUrl
└── README.md                   # File ini
```

---

## 🚀 Version History

**v3.1** - Latest
- ✅ Refund 100% dalam 10 menit (dengan countdown)
- ✅ Scan QR button di navbar center (FAB style)
- ✅ Map horizontal scroll (no landscape lock)
- ✅ Parking map realistic design

**v3.0** - Previous
- Iklan support gambar
- Transaksi overtime terpisah
- Footer simplified

---

## 💡 Tips untuk AI

1. **Refund Logic**: Cek `parking.ts` → `refundAmount()` function
2. **Countdown**: Lihat `HistoryView.tsx` → `getFullRefundCountdown()` + useEffect timer
3. **Navbar FAB**: Cek `page.tsx` → bottom nav dengan center scan button
4. **Map Scroll**: Lihat `map-page.tsx` → fixed width dengan overflow-x-auto
5. **Visual Design**: Cek `ParkingMap.tsx` → garis kuning + tiang logic

---

**Ready to deploy!** 🎉
