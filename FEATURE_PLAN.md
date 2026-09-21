# Parkir Binus — Feature Expansion Plan (v27+)

> **Venture Creation Project — Data Science Major**
> Prototype-first, production-ready structure. DS layer must be visibly prominent.

---

## Overview

| # | Feature | Target Files |
|---|---------|-------------|
| 0 | Remove all emoji → SVG icons | `HomeView.tsx`, all `src/` files |
| 1 | EV & disability slot types | `parking-data.ts`, `ParkingMap.tsx`, `HomeView.tsx`, `BookingView.tsx` |
| 2 | Wayfinding — animated path + text steps | New `WayfindingView.tsx`, `TicketView.tsx` |
| 3 | ANPR — simulated plate recognition | New `AnprConsole.tsx`, `OperatorView.tsx`, `parking-data.ts` |
| 4 | Receipt / invoice PDF download | `src/lib/invoice.ts` (new), `TicketView.tsx`, install `jspdf` |
| 5 | Push notifications via Service Worker | New `public/sw.js`, `NotifCenter.tsx`, `ProfileView.tsx`, `store.ts` |
| 6 | DS showcase — model card + prediction widget | `analytics.ts`, `AnalyticsView.tsx`, `HomeView.tsx` |

---

## Codebase Context

- **Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Shadcn/Radix, Zustand, Framer Motion, Lucide React
- **Data:** All simulated in Zustand store — Prisma schema is placeholder only, no real backend
- **Campuses:** Anggrek (building layout, 32 slots), Alam Sutera (open-lot, 40 slots), Bekasi (open-lot, 50 slots)
- **Emoji scope:** Only one emoji found — `👋` in `HomeView.tsx` line 125; i18n strings are emoji-free
- **Analytics:** `src/lib/analytics.ts` has frozen 30-day dataset, Holt-Winters forecast, z-score anomaly detection — MAPE not yet computed or exposed
- **PDF:** No PDF library installed — add `jspdf`
- **Service Worker:** None exists yet — `public/sw.js` is the target location
- **Icons:** All existing icons use Lucide React — stay consistent

---

## Task 0 — Remove All Emoji, Replace with SVG Icons

**Objective:** Replace every emoji character in the codebase with a semantically
equivalent Lucide icon so the UI is fully consistent and professional.

**Steps:**
1. In `HomeView.tsx` line 125, replace `👋` next to the user's first name with a
   `Sparkles` or `Hand` Lucide icon (`h-4 w-4 text-primary` inline)
2. Grep all `src/**` files for unicode emoji ranges to confirm no other occurrences
3. Audit all i18n string values in `parking-data.ts` for any hidden emoji in string literals

**Acceptance criteria:**
- Grep `src/**` for `[\u{1F000}-\u{1FFFF}]` returns zero matches
- Greeting still renders correctly with the SVG icon replacing the wave

**Demo:**
> Greeting shows "Selamat pagi, Rizky" with a clean Lucide SVG icon instead of 👋

---

## Task 1 — EV & Disability Slot Types

**Objective:** Add `EV` and `DISABILITY` slot subtypes to the data model, render them
with distinct icons on ParkingMap, allow filtered search in HomeView, and show a type
badge in BookingView.

**Steps:**

1. **`parking-data.ts`**
   - Add `slotType: "STANDARD" | "EV" | "DISABILITY"` to the `Slot` type
   - Assign subtypes in each campus builder:
     - Anggrek `buildSlots()`: A-01, A-02 → EV; A-17, A-18 → DISABILITY
     - Alam Sutera `buildAlamSuteraSlots()`: A-01, A-02 → EV; A-19, A-20 → DISABILITY
     - Bekasi `buildBekasiSlots()`: A-01, A-02 → EV; A-24, A-25 → DISABILITY
     - All others → STANDARD
   - Add i18n keys (ID + EN): `slotEv`, `slotDisability`, `slotStandard`,
     `filterAll`, `filterEv`, `filterDisability`

2. **`ParkingMap.tsx`**
   - Inside the slot bay cell, add a small icon overlay:
     - EV: `Zap` icon, `text-emerald-500 dark:text-emerald-400`, `h-2.5 w-2.5`
     - DISABILITY: `Accessibility` icon, `text-sky-500 dark:text-sky-400`, `h-2.5 w-2.5`
   - Add EV and DISABILITY rows to the `MapLegend` component

3. **`HomeView.tsx`**
   - Add filter state: `"ALL" | "EV" | "DISABILITY"` defaulting to `"ALL"`
   - Add three filter pills ("Semua" / "EV" / "Disabilitas") between window pickers
     and the search button
   - Filter `results.freeSlots` by `slotType` before passing to ParkingMap
   - Pass filtered slot IDs to ParkingMap as a `highlightIds` prop so non-matching
     slots render dimmed

4. **`BookingView.tsx`**
   - In the slot hero section, add a type badge chip:
     - EV → green "Slot EV" chip with `Zap` icon
     - DISABILITY → blue "Slot Disabilitas" chip with `Accessibility` icon

**Acceptance criteria:**
- "EV" filter → only EV slots visible in results, others dimmed
- "Disabilitas" filter → only DISABILITY slots visible
- Booking an EV slot shows the EV badge in BookingView
- Icons render correctly in both light and dark mode

**Demo:**
> Filter pills → tap "EV" → map dims non-EV slots, A-01/A-02 highlighted with green
> Zap icon → tap A-01 → BookingView shows green "Slot EV" badge

---

## Task 2 — Wayfinding: Animated Path + Step-by-Step Directions

**Objective:** Add a "Panduan Rute" button on TicketView (for CONFIRMED and CHECKED_IN
reservations) that opens a dialog showing an animated SVG path from the entrance to
the booked slot, plus numbered text directions below the map.

**Steps:**

1. **New `WayfindingView.tsx`**
   - Props: `open`, `onClose`, `reservation` (Reservation), `campus` (Campus)
   - Render a Dialog containing:
     - A simplified top-down map of the campus (SVG, reusing the same layout
       constants as ParkingMap — row A, lane, row B, gates)
     - An animated `<polyline>` path: entrance → lane midpoint → column of slot →
       slot cell; animate via `stroke-dasharray` / `stroke-dashoffset` with
       Framer Motion over ~1.2s
     - A pulsing dot at the destination slot
     - Numbered step list below the map (3–4 steps), derived from slot ID:
       1. Enter from MASUK gate
       2. Follow the main lane [direction]
       3. Turn into Row [A or B]
       4. Your slot [number] is on the [left/right], bay [n]
   - Handle both campus layouts: building (Anggrek, has RAMP/LIFT) and open-lot
     (Alam Sutera, Bekasi — simpler path)
   - Add i18n keys: `wayfindTitle`, `wayfindStep1`–`wayfindStep4`, `wayfindOpen`,
     `wayfindClose`

2. **`TicketView.tsx`**
   - Import and render `WayfindingView`
   - Add "Panduan Rute" / "Get Directions" button visible when
     `res.status === "CONFIRMED" || res.status === "CHECKED_IN"`

**Acceptance criteria:**
- Ticket for A-07 → path animates to column 7 of row A
- Ticket for B-14 → path turns into row B at column 14
- Bekasi B-20 → open-lot path geometry correct
- Text steps correctly reflect row and bay number

**Demo:**
> Tap "Panduan Rute" → dialog opens → yellow animated path draws from MASUK gate
> across lane into the booked slot → 4 numbered steps appear below the map

---

## Task 3 — ANPR: Simulated License Plate Recognition

**Objective:** Add an "ANPR Kamera" collapsible card to the operator Monitor tab.
Operator uploads a plate photo → simulated AI detection result with confidence score
→ matched reservation → one-tap check-in.

**Steps:**

1. **New `AnprConsole.tsx`**
   - File input (`accept="image/*"`) with photo preview thumbnail
   - Simulated OCR logic: hash the image file's `name + size` to deterministically
     select a plate from currently CONFIRMED reservations — same file always
     produces the same result, making demos reliable
   - Processing state: 1.2s progress bar + "Menganalisis plat..." label using
     `Loader2` icon animation
   - Result display:
     - Detected plate string (e.g. "B 5512 XYZ")
     - Confidence percentage (e.g. "94.7%") with a colored progress bar
       (green ≥ 85%, amber 70–84%, red < 70%)
     - Matched reservation card: driver name, slot number, booking window
   - "Konfirmasi Check-in" button → calls `manualCheckIn(reservationId)` +
     appends `ANPR_CHECKIN` to the audit trail
   - "Deteksi Manual" fallback: text input + lookup button for poor-quality photos

2. **`parking-data.ts`**
   - Add `"ANPR_CHECKIN"` to the `AuditAction` union type
   - Add i18n keys: `anprTitle`, `anprSub`, `anprAnalyzing`, `anprDetected`,
     `anprConfidence`, `anprConfirm`, `anprManual`, `anprNoMatch`

3. **`OperatorView.tsx`**
   - Import `AnprConsole`
   - Add it as a collapsible card in the Monitor tab, between the stat chips
     and the slot grid — with a `ScanLine` icon header and expand/collapse toggle

**Acceptance criteria:**
- Upload any image → 1.2s animation → result shows plate + confidence + reservation
- Confirm → reservation moves to CHECKED_IN + toast
- Audit log shows `ANPR_CHECKIN` entry with actor, IP, target slot
- Manual fallback text input also triggers check-in correctly

**Demo:**
> Operator expands "ANPR Kamera" → uploads a photo → "Menganalisis..." bar fills →
> "Plat terdeteksi: B 5512 XYZ · 94.7%" + driver card → confirm → check-in toast +
> audit entry visible in Audit tab

---

## Task 4 — Receipt / Invoice PDF Download

**Objective:** Add a "Unduh Kwitansi" button to TicketView for COMPLETED reservations
that generates and downloads a clean PDF invoice.

**Steps:**

1. **Install dependency**
   - Add `jspdf` to `package.json` dependencies

2. **`src/lib/invoice.ts`** (create or update the existing stub)
   - Export `generateReceipt(reservation, campus, lang)` function using `jspdf`
   - PDF layout:
     - Header: "PARKIR BINUS" (bold, large) + campus name + "KWITANSI PARKIR" title
     - Horizontal rule
     - Invoice number: reservation code
     - Date: formatted reservation date
     - Driver name, vehicle license plate
     - Campus + slot number + time window
     - Horizontal rule
     - Service fee row (label + right-aligned amount)
     - Overtime fine row — only render if `overtimeFee > 0`
     - Horizontal rule
     - Total row (bold)
     - Footer: "Terima kasih telah menggunakan Parkir Binus." + generation timestamp
   - Use monospace font for numbers, clean left/right alignment via `doc.text()` x coordinates
   - Filename: `kwitansi-${res.code}-${res.date}.pdf`

3. **`TicketView.tsx`**
   - Import `generateReceipt` from `invoice.ts`
   - Add "Unduh Kwitansi" / "Download Receipt" button visible only when
     `res.status === "COMPLETED"`
   - Add i18n keys: `downloadReceipt`, `receiptTitle`, `receiptFooter`

**Acceptance criteria:**
- Button appears only for COMPLETED reservations
- PDF downloads with correct reservation code, service fee, slot, campus name
- Overtime fine row only appears when `res.overtimeFee > 0`
- Works in both ID and EN (header language follows `lang`)

**Demo:**
> Completed ticket → tap "Unduh Kwitansi" → PDF downloads with BINUS header,
> itemized service fee + overtime fine, reservation code, and driver details

---

## Task 5 — Push Notifications via Service Worker

**Objective:** Register a Service Worker so session-ending alerts are delivered as
native OS push notifications even when the app tab is backgrounded — with a
permission toggle in ProfileView preferences.

**Steps:**

1. **New `public/sw.js`**
   - Listen for `message` events from the main thread (type `"NOTIFY"`)
   - Call `self.registration.showNotification(title, { body, icon, badge, tag })`
   - Use `tag` field to deduplicate repeat alerts for the same session

2. **`NotifCenter.tsx`** (or new `usePushNotif.ts` hook)
   - On user sign-in: call `Notification.requestPermission()`
   - On grant: register SW via `navigator.serviceWorker.register('/sw.js')`
   - Store `pushEnabled: boolean` in Zustand state
   - Upgrade existing `useSessionAlerts` hook: when a session is ≤ 15 min from
     ending AND SW is registered, post to SW:
     ```js
     navigator.serviceWorker.controller?.postMessage({
       type: "NOTIFY",
       title: "Parkir Binus",
       body: `Sesi ${slot} berakhir dalam ${minutes} menit`,
       tag: `end-${reservationId}`
     })
     ```

3. **`store.ts`**
   - Add `pushEnabled: boolean` to state (default `false`)
   - Add `setPushEnabled(v: boolean)` action

4. **`ProfileView.tsx`**
   - Add "Push Notifikasi" toggle row in the preferences section (below the
     theme toggle), using the existing `Switch` component
   - On toggle on: call `requestPermission()` → register SW → set `pushEnabled`
   - On toggle off: set `pushEnabled = false`
   - If `Notification.permission === "denied"`: show a disabled toggle with a
     note "Diblokir di browser. Aktifkan di pengaturan browser."
   - Gracefully hide the entire row if the SW API is unsupported
   - Add i18n keys: `pushNotif`, `pushEnable`, `pushDisabled`, `pushDenied`,
     `pushBlockedNote`

**Acceptance criteria:**
- Grant permission → minimize tab → session ≤ 15 min → OS notification fires
- Toggle off → no OS notification even when tab is backgrounded
- Permission denied → toggle shows disabled + blocked note
- In-app bell works in all cases regardless of push permission

**Demo:**
> User has active session ending in 14 min, browser minimized →
> OS notification: "Parkir Binus — Sesi A-07 berakhir dalam 14 menit.
> Perpanjang atau segera keluar."

---

## Task 6 — Data Science Showcase: Model Card + Prediction Widget

**Objective:** (a) Add a structured ML Model Card below the Holt-Winters forecast
chart in AnalyticsView, exposing model parameters and MAPE. (b) Add a "Prediksi AI"
occupancy strip in customer HomeView that reads from the forecast to show predicted
busyness for the selected booking window.

**Steps:**

1. **`src/lib/analytics.ts`**
   - Add `computeMAPE(world: AnaSession[]): { mape: number; alpha: number; beta: number; gamma: number }`
     - Use the last 7 days of the 30-day dataset as a hold-out set
     - Run the existing `holtWintersForecast()` on the preceding 23 days
     - Compare forecast vs actuals on the 7-day hold-out; return MAPE and the
       smoothing parameters α, β, γ used internally by the model
   - Export the function

2. **`AnalyticsView.tsx`** — Model Card section
   - Add `ModelCardSection` component below the existing forecast chart
   - Layout (bordered card, section dividers):
     - **Model:** "Holt-Winters Triple Exponential Smoothing"
     - **Parameters table:** α (level smoothing), β (trend), γ (seasonal) — numeric values
     - **Accuracy:** MAPE value with color grade badge:
       - < 10% → green "Baik"
       - 10–20% → amber "Cukup"
       - > 20% → red "Perlu Ditingkatkan"
     - **Training data:** 30 hari / N sesi / window 07:00–21:00 / hold-out 7 hari
     - **Features used:** Hour of day, day of week, demand tier, session type
     - **Limitations:** "Dataset sintetis deterministik — akurasi pada data real dapat berbeda"
   - Add i18n keys for all labels in both ID and EN

3. **`HomeView.tsx`** — Customer Prediction Widget
   - After the 3 window pickers (date / start / end) and before the search button,
     add a `PredictionStrip` component
   - Logic:
     - Import `buildAnalyticsWorld`, `holtWintersForecast`, `hourlyOccupancySeries`
       from `analytics.ts`
     - Memoize the forecast array once on mount (it's deterministic)
     - Map the selected `win.startTime` to the nearest forecast hour index
     - Read the predicted occupancy % from `forecast.forecast[index]`
     - Classify: < 40% → low (emerald), 40–70% → medium (amber), > 70% → high (red)
   - Render: a small colored ring (SVG circle, same style as the operator dial),
     the % value, and a natural-language tip:
     - Low → "Diprediksi sepi — waktu yang bagus untuk parkir"
     - Medium → "Diprediksi cukup ramai — disarankan pesan lebih awal"
     - High → "Diprediksi sangat ramai — segera pesan untuk amankan slot"
   - Re-memoize when `win.date` or `win.startTime` changes
   - Add i18n keys: `aiPredict`, `aiPredictLow`, `aiPredictMed`, `aiPredictHigh`,
     `aiPredictLabel`

**Acceptance criteria:**
- Model card shows MAPE < 15%, α/β/γ values are present and non-zero
- Selecting Friday peak hour → strip shows high prediction (> 65%)
- Selecting Sunday 07:00 → strip shows low prediction
- Changing the time window updates the prediction in real time
- MAPE computation uses a held-out set (not the full training set)

**Demo (operator):**
> Analytics tab → below forecast chart → Model Card shows:
> "Holt-Winters Triple Exponential Smoothing · α=0.32 · β=0.08 · γ=0.41
> · MAPE=7.2% · Baik · Training: 30 hari / 1,412 sesi · Hold-out: 7 hari"

**Demo (customer):**
> Select Friday 10:00–12:00 →
> "Prediksi AI: 78% terisi — Diprediksi sangat ramai. Segera pesan untuk amankan slot."

---

---

## Task 7 — Real Camera QR Scanner

**Objective:** Replace the simulated camera feed in `ScannerView.tsx` with a real
live camera stream that actually reads QR codes. The physical QR prints in
`download/qr-slot/` already encode the correct payloads (`PB-A-01`, `AS-A-03`,
`BKS-B-12`) — scanning them with this feature will trigger real check-in/walk-in
flows in the app.

**Context:**
- `ScannerView.tsx` already has all the scan logic (`handleScan()`, flash animation,
  manual fallback, "my sessions" quick-tap) — only the camera part is fake
- The existing scan frame UI (corner brackets, scanline animation) can stay as the
  overlay on top of the real video feed
- QR payloads for all 3 campuses are already correct and machine-readable
  (verified with pyzbar in v9/v15)

**Browser API strategy:**
- **Primary:** `BarcodeDetector` API — native browser API, zero dependencies,
  available in Chrome/Edge/Safari 17+. Reads QR codes directly from a
  `<video>` element frame.
- **Fallback:** `@zxing/browser` library — works in Firefox and older browsers.
  Same interface, just a different detector under the hood.
- Detect at runtime which API is available and use accordingly.

**Steps:**

1. **Install fallback dependency**
   ```bash
   bun add @zxing/browser @zxing/library
   ```

2. **`ScannerView.tsx`** — replace the fake camera section
   - Add a `<video ref={videoRef} autoPlay playsInline muted>` element behind
     the existing scan frame overlay. Style it `absolute inset-0 object-cover
     w-full h-full` so it fills the dark background area.
   - On open (`useEffect` when `open === true`):
     - Call `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })`
     - On success: set `video.srcObject = stream`, start the decode loop
     - On permission denied: show a friendly error state with a `CameraOff` Lucide
       icon and the message "Izin kamera diperlukan untuk scan QR" with a
       "Coba Lagi" button
   - **Decode loop** (runs via `requestAnimationFrame` or `setInterval` every 250ms):
     ```ts
     // Try native BarcodeDetector first
     if ("BarcodeDetector" in window) {
       const detector = new BarcodeDetector({ formats: ["qr_code"] });
       const results = await detector.detect(videoEl);
       if (results.length > 0) handleScan(results[0].rawValue);
     } else {
       // @zxing fallback
       const result = await codeReader.decodeFromVideoElement(videoEl);
       if (result) handleScan(result.getText());
     }
     ```
   - On close (`useEffect` cleanup): stop all video tracks via
     `stream.getTracks().forEach(t => t.stop())` to release the camera
   - Keep the existing scan frame corners, scanline animation, and flash overlay
     — they now sit on top of the real video feed as a UI overlay
   - Keep the manual code input and "my sessions" bottom sheet unchanged
   - Add a torch/flashlight toggle button in the top bar (use `ImageCapture` API
     if available, gracefully hidden if not) — useful for scanning in dark
     parking garages
   - Add i18n keys: `camPermDenied`, `camRetry`, `camScanning`, `camTorch`

3. **`next.config.ts`**
   - No changes needed — `getUserMedia` works in Next.js client components
     out of the box. The `"use client"` directive is already present.

4. **`public/` (optional)**
   - No service worker changes needed for this feature

**Camera permission flow:**
```
Open scanner
    ↓
getUserMedia({ facingMode: "environment" })
    ↓ granted                    ↓ denied
Real video stream          Error state:
+ decode loop              CameraOff icon
    ↓                      + "Izin kamera diperlukan"
QR detected                + "Coba Lagi" button
    ↓                      + manual input still works
handleScan(payload)
    ↓
flash animation → onResult() → ticket / toast
```

**Acceptance criteria:**
- Opening the scanner on a phone requests camera permission
- After granting, real camera feed appears behind the scan frame overlay
- Pointing the camera at any QR from `download/qr-slot/PNG/` triggers
  `handleScan()` with the correct slot number
- `PB-A-01` → walk-in or check-in for Anggrek A-01
- `AS-B-03` → walk-in or check-in for Alam Sutera B-03
- `BKS-A-07` → walk-in or check-in for Bekasi A-07
- Camera stream stops (camera light turns off) when scanner is closed
- Permission denied → friendly error state, manual input still works
- Desktop browsers with no rear camera → falls back to any available camera
  (front camera or webcam)

**Demo:**
> Customer opens scanner FAB → camera permission prompt → grants → real camera
> feed appears → points phone at the printed QR-A-07 card →
> flash animation fires → "Sesi walk-in dimulai" toast → TicketView opens for A-07

---

## Execution Order

```
Task 0 (emoji)  → Task 1 (EV/disability) → Task 2 (wayfinding)
                                         → Task 3 (ANPR)
Task 1           → Task 4 (receipt PDF)
Task 4           → Task 5 (push notifications)
Task 5           → Task 6 (DS showcase)
Task 7 (camera QR) — independent, can run any time after Task 0
```

Tasks 2 and 3 can run in parallel after Task 1.
Task 7 is independent — it only touches `ScannerView.tsx` and does not
conflict with any other task. Can be done at any point.
Task 6 is last because it touches HomeView (modified in Task 1) and analytics.ts.

---

## Dependencies to Install

```bash
bun add jspdf
bun add @zxing/browser @zxing/library
```

No other new dependencies required — Lucide React, Framer Motion, Zustand, and
the existing analytics engine cover all other features.

---

## Files to Create (New)

| File | Feature |
|------|---------|
| `public/sw.js` | Task 5 — Service Worker |
| `src/components/parking/WayfindingView.tsx` | Task 2 — Wayfinding |
| `src/components/parking/AnprConsole.tsx` | Task 3 — ANPR |
| `src/lib/invoice.ts` | Task 4 — Receipt PDF (may already exist as stub) |

## Files to Modify (Existing)

| File | Tasks |
|------|-------|
| `src/lib/parking-data.ts` | 1, 3 |
| `src/lib/analytics.ts` | 6 |
| `src/lib/store.ts` | 5 |
| `src/components/parking/ParkingMap.tsx` | 1 |
| `src/components/parking/HomeView.tsx` | 0, 1, 6 |
| `src/components/parking/BookingView.tsx` | 1 |
| `src/components/parking/TicketView.tsx` | 2, 4 |
| `src/components/parking/OperatorView.tsx` | 3 |
| `src/components/parking/AnalyticsView.tsx` | 6 |
| `src/components/parking/NotifCenter.tsx` | 5 |
| `src/components/parking/ProfileView.tsx` | 5 |
| `src/components/parking/ScannerView.tsx` | 7 |
