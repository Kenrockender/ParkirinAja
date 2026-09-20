
---

## ⚠️ RECOVERY LOG — Insiden Restore Environment (20 Sep 2026, ~03:15 UTC)

Environment di-restore oleh platform ke snapshot checkpoint v16 (commit e53d23b, 17 Sep 08:38):
- Semua file terlacak di-revert ke state v16; file tidak-terlacak hasil Task 15–23 DIHAPUS (analytics.ts, AnprConsole.tsx, FinanceView.tsx, AuditView.tsx, SystemView.tsx, SystemCards.tsx, ledger.ts, invoice.ts, cashflow.ts, semua test-v2x.mts / e2e-v2x.mjs / vlm-v17+ / shots).
- worklog.md terpotong dari 470 → 246 baris: entry Tasks 15–18 (v17–v21) HILANG. Entry Tasks 19–23 (v22–v26) diselamatkan verbatim di bawah dari bacaan sesi (dibaca sebelum gelombang pemotongan kedua).
- Penyebab root: auto-checkpoint platform gagal menangkap perubahan v17–v26 ke git (index basi — commit 17 Sep 12:58 & amend 19 Sep 16:40 tetap berisi tree v16), sehingga restore pagi ini tidak punya state lebih baru untuk dipulihkan.
- Scope Task 15–18 yang hilang (direkonstruksi dari ringkasan percakapan): v17/v18 = dataset analitik 30-hari deterministik + AnalyticsView (heatmap, forecast Holt-Winters + model card/MAPE, anomali z-score, pendapatan, what-if, CSV) + konsol ANPR; v20 = tembok/entrance peta; v21 = L2 ramp + DECK alignment (L2RAMP_W). Detail verbatim entry tidak dapat dipulihkan.
- Strategi rebuild: bangun LANGSUNG ke state akhir v26 (bukan state antara) — pricing model v22, ramp seamless L2RAMP_BLOCK_W v25, AuditView tanpa RBAC v25, changelog v17→v26, pembayaran v26 — lalu commit ke git di tiap milestone agar kehilangan tidak terulang.

---

Task ID: 19 [RECOVERED]
Agent: Super Z (main agent)
Task: v22 — pricing model rework per user clarification: "tidak ada biaya parkir". New model (confirmed via AskUserQuestion): service fee = dynamic demand-tier pricing only (LOW 15/20/30K reserve; walk-in = tier base + flat 10K → 25/30/40K); late fine = Rp5.000 per STARTED hour past the booked window, rounded UP, uncapped (15:20 → 5K, 16:30 → 10K); refund policy unchanged (100% ≤10min, 50% after); parking-fee labels removed from ticket/checkout.

Work Log:
- parking-data.ts: TARIFF stripped of parkFirstHours/parkFirstHoursFee/parkAddHourFee/parkMaxFee, +walkInSurcharge 10000; DEMAND_TIERS HIGH walk-in 35K→40K (all walk-ins = base+10K, enforced structurally); parkingFee() DELETED; overtimeFee() kept (already ceil-per-hour, now the ONLY exit charge); Reservation.parkingFee field removed; TxnType "PARKING_FEE" removed; i18n — tParkingFee/estParking keys deleted, checkoutConfirmDesc ("Tidak ada biaya parkir — hanya denda keterlambatan…"), estOvertime→"Estimasi denda telat", +onTimeFree ("Masih sesuai jadwal — tanpa biaya tambahan"), tOvertime→"Denda telat", overtimeNote/revenueHourSub/anaRevenueSub/extendHint/checkOutBtn/dynOvertime reworded (ID+EN)
- store.ts: checkOut/forceCheckOut charge ONLY the late fine (oFee from plannedEnd; insufficient only when oFee>0; no txn when on-time — receipt notif total = fine); PARKING_FEE txns removed everywhere (seeds, anggrek done-loop, historical); seeds: completed-yesterday now overtimeFee 5K only; +__parkir window hook for e2e (store exposed on window)
- TicketView.tsx: fee grid 3-col→2-col (service + fine/refund); sessionDone total = service+fine−refund; checkout dialog shows fine row + total when late, green onTimeFree checkmark note when on schedule; toast shows rupiah(fine) or onTimeFree
- OperatorView.tsx: TXN_META PARKING_FEE entry removed; CSV TOTAL PENDAPATAN = SERVICE_FEE+OVERTIME; CompletedCard row = serviceFee+overtimeFee; WalletView.tsx: PARKING_FEE icon/label removed; ProfileView.tsx: personal spend = service+fine
- analytics.ts: AnaSession.parkingFee→overtimeFee; plannedWindowMin(isAdvance, durMin) — walk-in 120min / advance 60·120·180 by durMin%3 (derived WITHOUT touching the PRNG stream → dataset timings/MAPE identical to v18, only fees change); total = service+fine; CSV column parking_fee→late_fee
- tests: test-tier.mts HIGH 30K/40K + flat-10K-surcharge check; test-as.mts +9 v22 checks (tariff keys gone, user's exact examples 20min→5K & 90min→10K, 61min→10K ceil, 0/negative→0, 600min→50K uncapped, sessions carry fines not parking fees, CSV late_fee column) → 85/85 & 15/15
- e2e (scripts/e2e-v22.mjs): 14/14 — ticket has zero "Biaya parkir" text; on-time dialog shows free note & no fine row; window rewound −25min via __parkir → "Estimasi denda telat Rp5.000" + Total Rp5.000 → confirm → wallet 230.000→225.000 exactly, OVERTIME txn 5K, reservation COMPLETED overtimeFee=5000 parkingFee=undefined, zero PARKING_FEE txns; wallet labels (Denda telat ✓, no Biaya parkir); operator revenue card "Hari ini · layanan & denda" — zero page errors
- VLM (scripts/vlm-v22-check.ts): on-time dialog quotes "Tidak ada biaya parkir — hanya denda keterlambatan (jika telat)…" + green note; late dialog shows Estimasi denda telat + Total Rp5.000, no parking-fee row; wallet categories = Denda telat/Biaya layanan parkir/Top up dompet/Refund only

Stage Summary:
- v22 delivered the no-parking-fee pricing model end-to-end: dynamic service fee (walk-in = base+10K flat surcharge, HIGH tier now 25/40K), Rp5.000/started-hour late fine (ceil, uncapped) as the ONLY exit charge, parking-fee labels/txns/fields/CSV column fully removed from customer ticket, wallet, operator console (monitor+CSV+analytics), and the 30-day analytics dataset (revenue = service + fines; dataset stream unchanged so forecast/MAPE checks stay valid). Refund policy untouched. Next-round candidates: L2 floor map, turn-by-turn wayfinding, EV booking flow, per-floor analytics drilldown.

---
Task ID: 20 [RECOVERED]
Agent: Super Z (main agent)
Task: Iteration v23 per user feedback — "sisi IT dan financenya kurang menonjol": showcase IT & Finance depth. User said "gas kerjain" → proceeded with recommended defaults: 5 features (2 IT + 3 finance), combination placement, v18 analytics dataset untouched.

Work Log:
- parking-data.ts: +types (AuditAction ×16, AuditEntry, AuditSeverity, LiveEvent/LiveEventKind, LiveGuest, LiveConnStatus, maskPlate() privacy helper) + ~117 i18n keys × ID/EN (live*/fin*/audit*/a*/via*/rbac*/auditColAction)
- src/lib/ledger.ts (NEW): double-entry engine — CoA 5 akun (1-1100 Kas & Bank DR, 2-2100 Utang Saldo Pengguna CR, 4-4100 Pendapatan Layanan CR, 4-4200 Pendapatan Denda CR, 5-5100 Beban Refund DR), postTransaction (TOP_UP→Dr Kas/Cr Utang, SERVICE_FEE→Dr Utang/Cr Layanan, OVERTIME→Dr Utang/Cr Denda, REFUND→Dr Beban/Cr Utang; zero-amount→null), buildJournal, trialBalance, profitAndLoss, cashPosition (invariant Kas−Utang=Laba), breakEven + BEP_DEFAULTS (15jt fixed, 2.5rb var), rupiahShort (jt/rb)
- store.ts: create() converted to block body with closure audit() helper (append-only, cap 250, fakeIp per actor/role — 10.20.x operator, 114.10.x user, 127.0.0.1 system); EVERY action instrumented (SIGN_IN/OUT, BOOKING_CREATED, BOOKING_CANCELLED, REFUND_ISSUED, CHECK_IN/OUT via ticket/scan, WALK_IN_STARTED, FORCE_CHECKOUT warning, SESSION_EXTENDED, MANUAL_CHECKIN warning, TOP_UP, SLOT_MAINTENANCE warning, CAMPUS_SWITCHED, PROMO_BROADCAST); checkOut(id, via?); seedAuditLog derives believable history from seeded world txns + maintenance slots + SYSTEM entry; live engine: LIVE_PEOPLE ×10, liveToggle (connecting 900ms→live, interval 3.4s), liveStep (in/out weighted by occupancy >70%, latency 8–41ms, reconnect every 11th tick 1.3s, guests NEVER touch reservations/txns/ledger), SESSION_ID per page load; signOut clears live state
- FinanceView.tsx (NEW): KPI strip (Pendapatan bersih/Sesi berbayar/ARPU/Rasio denda) + JournalCard (data-je-id, Dr emerald/Cr amber, scroll 14) + TrialBalanceCard (data-trial-balanced, SEIMBANG badge, Dr=Cr total, accounting-equation line w/ retained earnings) + WaterfallCard (SVG 4-bar: Layanan→Denda→Refund↓→Laba gold, connectors dashed) + BepCard (sliders fixed 5–40jt/var 0.5–10rb, SVG revenue vs cost lines crossing at BEP dot, CM/BEP/current run-rate/safety margin, run-rate scaled 30d/windowDays, data-bep-sessions)
- AuditView.tsx (NEW): SessionCard (sess- id, aktor, role badge, IP, SSO, append-only note) + RbacCard (10 rows × Pengguna/Operator check/cross matrix) + AuditLogCard (filter Semua/Aksi operator/Peringatan, AnimatePresence live-append, data-audit-action rows: time, severity dot, icon, label, target, actor·role·ip, detail)
- OperatorView.tsx: 7 tabs (grid-cols-7, vertical icon+label mobile → horizontal ≥sm), FinanceView+AuditView gating, LiveStatusPill in header (click=toggle), LiveOpsCard (12-col: transport wss://, uptime mm:ss, events, avg latency, reconnects, toggle; event stream 6 rows full plates) after PricingCard, SlotMonitorCard +guestIds (guest tiles OCCUPIED + ring-amber-400 + ping dot, TAMU legend), stats memo includes guests
- ParkingMap.tsx: useGuestMap() hook (liveOn + viewWindow-covers-now guard → future windows never show guests), SlotBay +live prop (amber ring + ping dot + data-live-guest), 3 row components + ParkingMap counts + useMapCounts all guest-aware
- MapView.tsx: LiveMapPill header toggle + ticker bar (masked plate maskPlate(), in/out verb, time-ago, LIVE·xx ms chip) + liveMapNote legend hint ("Cincin kuning = tamu live")

Verification (all green):
- test-ledger.mts 28/28: posting rules ×4, per-entry Σdr=Σcr, trial balance Dr=Cr (+Kas 300K/Utang 250K case), accounting equation Kas−Utang=netIncome, P&L aggregation, zero-refund null, BEP math (ARPU 22.5K/CM 20K/BEP 750/safety +25% −50%/CM≤0→∞), rupiahShort
- tsc clean (src), eslint clean (src)
- e2e-v23.mjs 37/37: 7 tabs, live toggle→LIVE, events≥3/guests≥1/latency 8–41, guest stream ledger-safe (txns stable), guest tiles + TAMU legend, journal ≥5 entries, SEIMBANG, waterfall, BEP 591 + slider +5jt→788, RBAC + "Paksa akhiri sesi", audit 67 seeded, forceCheckOut→live-appended FORCE_CHECKOUT, warning filter 7/61, customer map OFFLINE pill→live ticker masked plate + guest slots + txns unchanged; zero page errors
- Regression: e2e-v22 14/14, e2e-v21 10/10 (map geometry intact), test-as 85/85, test-tier 15/15
- VLM (glm-4.6v): audit-full 9/10 (trail populated, amber warning dots), operator-slots 9/10 (3 amber tiles A-07/A-16/B-10 + TAMU chip), map-live-wide 8/10 (LIVE 32ms pill, masked ticker, amber B-03), finance.png all 4 components confirmed (balanced Dr/Cr rows with account codes, Dr Rp530.000 = Cr Rp530.000); VLM feedback → +liveMapNote legend hint

Stage Summary:
- v23 delivered: (IT) real-time gate stream simulation w/ connection state machine + latency + reconnect, live map occupancy overlay (privacy-masked plates for customers, full plates for operator), append-only audit trail across all 16 action types w/ actor/role/IP/severity, RBAC matrix, session context; (Finance) double-entry ledger with 5-account CoA, balanced journal from real txns, trial balance + accounting equation, P&L waterfall, interactive BEP with assumption sliders, finance KPIs (net/ARPU/fine ratio). Guest stream provably never touches the ledger.
- Key artifacts: NEW src/lib/ledger.ts, FinanceView.tsx, AuditView.tsx; modified parking-data.ts, store.ts, OperatorView.tsx, ParkingMap.tsx, MapView.tsx; NEW scripts/test-ledger.mts, e2e-v23.mjs, shots-v23-b.mjs, vlm-v23-check.ts, vlm-v23b-check.ts
- Screenshots: scripts/shots/v23-*.png (8 captures)

---
Task ID: 21 [RECOVERED]
Agent: Super Z (main agent)
Task: Iteration v24 — user "gas lakukan ketiganya" (the three remaining IT & Finance wishlist features after v23): Developer/API Docs, System Design & ERD, PPN & Invoicing — plus Cash Flow Projection as the finance hedge (the only unshipped "Forecast" chart from the original candidate list). Constraint kept: v18 dataset & v23 ledger untouched (PPN is a display/reporting layer).

Work Log:
- src/lib/invoice.ts (NEW): PPN 11% gross-up engine — splitPpn (DPP = gross/1.11 rounded, PPN = gross−DPP, invariant DPP+PPN===gross), buildInvoices (revenue txns only — SERVICE_FEE/OVERTIME; TOP_UP/REFUND excluded; serial INV-YYYYMM-NNNN per calendar month, newest first; buyer/plate lookup from reservations), ppnRecap (per-month + totals), monthKey. Ledger stays GROSS — reporting layer only
- src/lib/cashflow.ts (NEW): 14-day revenue projection — zero-filled calendar from revenueAgg per-day, weekday-profile mean + EWMA level (α0.3), forecast = max(0, profile+dow+level), 90% band = ±1.645σ of residuals; read-only from buildAnalyticsWorld (v18 stream untouched)
- src/components/parking/SystemCards.tsx (NEW): ArchCard (responsive HTML bands — Klien PWA/Konsol/ANPR → Edge Gateway/WebSocket Hub → Aplikasi Next.js 16 Router/Store/Modul → Data, flow chips HTTPS·JSON / WSS·3.4s), ErdCard (fixed-width 648×392 SVG in h-scroll like the full map — 8 entities CAMPUS/SLOT/USER/RESERVATION/VEHICLE/TXN/AUDIT_ENTRY/LIVE_EVENT with PK gold/FK primary markers, 1:n lines, dashed actor·target, LIVE_EVENT display-only note), StackCard (8 rows), ChangelogCard (v17→v24 timeline, 7 releases)
- src/components/parking/SystemView.tsx (NEW): ApiDocsCard — 8 REST endpoints (method badges GET emerald/POST amber, mono paths, auth lock), meta chips (Base URL/X-API-Key+Bearer/60 req-min/error codes 400–429), interactive Playground: ALL endpoints runnable, responses built LIVE from real store state (slots+status via slotStatusForWindow, availability+DEMAND_TIERS, finance via buildJournal/profitAndLoss/trialBalance with balanced:true, live via liveEvents), writes return 201 + "simulated":true (never mutate store), deterministic latency 12–34ms, curl preview per endpoint
- FinanceView.tsx: +InvoiceCard (recap chips Faktur/Total DPP/PPN Keluaran gold/Bulan ini; serial invoice list; document dialog — INV number, LUNAS stamp, bill-to, item, DPP cyan/PPN amber/Total gold rows) + CashflowCard (3 KPI chips Proyeksi 14 hari/Rata-rata-hari/Δ vs last-14; SVG: green actual context 10d, gold dashed forecast 14d, shaded 90% band, now divider; method note) — grid now Journal(7)/Trial(5)/Waterfall(7)/BEP(5)/Invoice(7)/Cashflow(5)
- OperatorView.tsx: 8th tab "sistem" (Network icon, after audit) — OpTab type + tabs[] + grid-cols-7→grid-cols-8 + <SystemView transactions reservations slots> mount
- parking-data.ts: +88 i18n keys × ID/EN (opTabSystem, api*/ep*/arch*/erd*/stack*/chgV17–24, inv*/cf*)
- scripts/test-v24.mts (NEW): 40/40 — splitPpn invariants ×8 tariff amounts + ≈11%±1 + zero, invoice filtering (5 of 7), per-month sequential numbering, newest-first, buyer lookup + null fallback, every DPP+PPN===gross, recap sums + months ascending, ledger-still-gross + trial balance Dr100000=Cr, cashflow determinism, 14 pts, ≥0, band≈1.645σ±2, Σ=total, zero-filled no-gap calendar, forecast continues history, sane 1,63jt/day, Δ−2%, Sat≪Tue weekly pattern (v18 dataset convention: quiet day lands on calendar Saturday — getDay-based, locked), empty input
- scripts/e2e-v24.mjs (NEW): 38/38 — 8 tabs; API docs 8 endpoints; playground GET /slots→200+campus+slots+live status, GET /finance/summary→trialBalance balanced:true, POST /reservations→201+simulated; arch bands; ERD 8 entities+PK/FK+note; stack 8; changelog 7; Keuangan regression journal≥5+SEIMBANG; invoices 20 serial INV-202609-0020, regex ^INV-\d{6}-\d{4}$, recap chips, dialog DPP 27027+PPN 2973===Total 30000 & DPP≈gross/1.11±2 & LUNAS; cashflow total 22.77jt>1jt + band path + KPI chips; zero page errors
- VLM round 1: system 9/10, system-full 9/10, invoice 7/10 (background bleed-through), finance-full 8/10 (band invisible at 0.13 opacity) → FIXES: dialog bg-card→bg-card/95+backdrop-blur-xl (established pattern), band opacity 0.13→0.28+gold stroke → VLM round 2 (vlm-v24b-check.ts): invoice 9/10 solid no bleed, cashflow 9/10 band clearly visible; +legend 90% chip gold-tinted polish; final e2e re-run green

Verification (all green):
- test-v24 40/40, test-ledger 28/28, test-as 85/85, test-tier 15/15
- tsc 0 src errors, eslint clean
- e2e: v24 38/38 (final run after fixes), v23 PASSED, v22 PASSED, v21 PASSED — zero page errors everywhere
- VLM: v24-system 9/10, v24-system-full 9/10, v24-invoice 9/10 (after fix), v24-cashflow 9/10 (after fix)
- Screenshots: scripts/shots/v24-api-playground.png, v24-system.png, v24-system-full.png, v24-invoice.png, v24-cashflow.png, v24-finance-full.png; VLM checks: scripts/vlm-v24-check.ts, vlm-v24b-check.ts

Stage Summary:
- v24 delivered the three remaining IT & Finance depth features: (IT) REST API documentation with 8 endpoints + fully interactive playground whose GET responses are built live from real app state (ledger trial balance included) with clearly-simulated writes, responsive system architecture diagram, 8-entity ERD with PK/FK + cardinality, tech stack, and the v17→v24 changelog; (Finance) PPN 11% invoicing — serial-numbered invoices from real revenue txns with DPP/PPN gross-up split (reporting layer; the v23 double-entry ledger provably untouched), PPN keluaran recap, and a 14-day cash-flow projection (weekly profile + EWMA level, 90% band) read-only from the v18 analytics dataset. Operator console now 8 tabs. Regression suite fully green (v21/v22/v23 e2e + 85+15+28 unit checks).
- Key artifacts: NEW src/lib/invoice.ts, cashflow.ts, SystemView.tsx, SystemCards.tsx, scripts/test-v24.mts, e2e-v24.mjs, vlm-v24-check.ts, vlm-v24b-check.ts; modified parking-data.ts (+88×2 i18n), FinanceView.tsx (+2 cards), OperatorView.tsx (8th tab)
- Remaining wishlist candidates (not yet built): L2 floor map, EV booking flow specifics, turn-by-turn wayfinding text, per-floor analytics drilldown

---
Task ID: 22 [RECOVERED]
Agent: Super Z (main agent)
Task: Iteration v25 — user UX fixes (6 items): remove RBAC panel + "sedang parkir/slot kosong" badges above campus picker, searchable car-brand dropdown (cars only), bigger seamless L2 ramp, custom-amount wallet top-up, bright parking ticket, editable customer profile.

Work Log:
- parking-data.ts: −21 i18n keys (rbac×10, auditRbacTitle/Sub, auditColAction/User/Operator, activeSessions) + ~45 new × ID/EN (brand dropdown, body type, wallet custom top-up, edit profile + validations, chgV25); Vehicle +bodyType?; NEW CAR_BRANDS (25 popular Indonesian car brands incl. EV: Toyota…Volvo) + CAR_BODY_TYPES (MPV/SUV/Crossover/Sedan/Hatchback/Pick-up/Van); geometry rework: rowBToWallWidth now merges the wall·downL2·wall triple into ONE ramp-block child (blockWidth param), NEW L2RAMP_BLOCK_W replaces L2RAMP_W (compact 96 / full 112 — ramp + both flanking walls + internal gaps absorbed; walls after B-14/A-18 still aligned ±0px, verified analytically)
- ParkingMap.tsx: NEW RampBlockBox — one seamless child (integrated 8px wall edge strips both sides, blue ramp body with chevrons + icon + label, data-map-el="ramp-l2"); RampBox loses downL2 variant (up/down only); BuildingRowB indexed loop renders the merged triple; b-wall count 8→6
- HomeView.tsx: greeting badges removed (activeCount/2 sedang parkir + free/total slot kosong above CampusBar); hero availability + search button chip kept; Gauge import dropped
- AuditView.tsx: RbacCard + RBAC_ROWS deleted; grid → SessionCard(5) + AuditLogCard(7) side-by-side
- VehicleModal.tsx rewritten: BrandPicker (closed → searchable list with startsWith-then-substring filter + "Lainnya (tulis sendiri)" → free-text custom brand; unknown seeded brands open in Other mode) + body-type chips; brand now required; payload +bodyType
- WalletView.tsx: 4 quick chips (50/100/200/500K) + custom-amount row (Rp input, dot-thousand formatting, min 10K/max 10jt validation with amber error, disabled button, data-topup-custom*)
- TicketView.tsx: pass redesigned bright ivory boarding-pass (#faf6e9 both themes, data-ticket-pass) — dark ink text, binus-blue gradient slot number, white/70 info boxes with #e7ddc0 borders, emerald-600 active timer, dark perforation, QR on white; never dark again
- ProfileView.tsx: NEW EditProfileModal (name/email required + phone/NIM optional; per-field validation: email regex, phone ^\+?\d[\d\s-]{7,14}$, NIM ^\d{8,10}$; i18n errors) + "Edit Profil" pill (z-10, data-edit-profile-btn) on identity card; identity shows NIM · phone line; store.updateProfile added (User +phone?/nim?)
- store.ts: all vehicles are now CARS — veh-1 Vario→Honda HR-V (SUV), mk() default + walkIn fallback "Honda HR-V", OP_PEOPLE motorcycles replaced (Beat→Brio, NMAX→Innova Zenix, Vario 125→HR-V, Scoopy→Rocky, Mio→Baleno, CB150→Xpander, Lexi→Livina); veh-2 +MPV
- SystemCards.tsx: changelog v17→v24 → v17→v25 (8 releases, chgV25)
- Tests: test-v25.mts NEW (16 checks — brand list composition/search, body types, ramp block geometry invariants incl. 84+28=112 derivation); e2e-v25.mjs NEW (26 checks across all 6 fixes); test-as.mts geometry checks updated to L2RAMP_BLOCK_W; e2e-v21 assertions updated (96/112 block ≥ gate, 6 walls); e2e-v23 RBAC checks inverted (matrix REMOVED); e2e-v24 changelog 7→8; test-v24 fixture Vario→Avanza

Verification (all green):
- Unit: test-as 85/85, test-tier 15/15, test-ledger 28/28, test-v24 40/40, test-v25 16/16
- tsc clean (src), eslint clean
- e2e: v21 10/10 (walls aligned ±1px, block 96/112), v22 14/14, v23 37/37, v24 38/38, v25 26/26 — zero page errors
- VLM (glm-4.6v): map-ramp 9/10 ("blok monolitik, tidak ada celah"), ticket 9/10 (ivory, kontras excellent), brand-dropdown 10/10, wallet 9/10, home greeting 9/10 (clean, hero intact), audit 9/10 (RBAC gone, balanced)

Stage Summary:
- v25 delivered all six user-requested fixes: clean home greeting (badges removed, hero kept), searchable car-brand dropdown with Other + body-type chips and car-only data everywhere (no motorcycles in seeds, operator stream, tickets, or fixtures), L2 ramp as one big seamless 2.2-bay block with walls absorbed (no dark slits; end walls still perfectly aligned), custom-amount wallet top-up with validation, bright ivory boarding-pass ticket readable in both themes, and full customer profile editing (name/email/phone/NIM with validation). Changelog now v17→v25.
- Key artifacts: modified parking-data.ts, ParkingMap.tsx, HomeView.tsx, AuditView.tsx, VehicleModal.tsx (rewritten), WalletView.tsx, TicketView.tsx, ProfileView.tsx, store.ts, SystemCards.tsx; NEW scripts/test-v25.mts, e2e-v25.mjs, vlm-v25-check.ts
- Screenshots: scripts/shots/v25-*.png (home, map-ramp, ticket, wallet, profile, brand-search, garage, audit)

---
Task ID: 23 [RECOVERED]
Agent: Super Z (main agent)
Task: Iteration v26 — user payment & profile features: (1) wallet top-up via bank Virtual Account / credit-debit card / QRIS, (2) parking time-left notification (30 min before) with quick extend, (3) changeable profile photo.

Work Log:
- parking-data.ts: NEW payment section — VA_BANKS (8 Indonesian banks with real issuer prefixes: BCA 8808, Mandiri 89508, BNI 9889, BRI 8881, CIMB 8027, Danamon 8717, Permata 8528, BSI 7109 + brand colors), vaNumberFor (16-digit, prefix + amount tail + rand), groupVa (4-4-4-4), formatCardNumber, luhnValid (real Luhn checksum), expiryValid (MM/YY not past), qrisPayload (merchant + NMID + amount + timestamp); AuditAction +PROFILE_UPDATE; +50×2 i18n keys (payment dialog, VA, card, QRIS, ending-soon banner/toast, avatar, aProfileUpdate, chgV26)
- store.ts: User +avatar?: string|null; topUp(amount, note?) — payment method recorded on the TOP_UP txn + audit detail; setAvatar(dataUrl|null) with PROFILE_UPDATE audit
- WalletView.tsx rewritten top-up flow: chips & custom amount now open TopUpDialog — state machine method→va→va-pay→card→qris→processing→done; VA: 2-col bank grid → 16-digit VA on primary panel + copy button (clipboard + fallback) + amount/expiry rows + how-to; Card: live blue card preview (chip, brand detect Visa/Mastercard/JCB, live number/name/expiry) + inputs with inline validation (Luhn, name≥3, MM/YY auto-slash not-past, CVV 3-digit) — invalid submit shows errors, valid settles; QRIS: white QR card (QRCodeSVG, merchant PARKIR BINUS KEMANGGISAN, red QRIS badge, amount) + any-app hint; settle = 1.1s simulated gateway → topUp(amount, note "VA BCA" / "Kartu •••• 4242" / "QRIS") → success screen (+amount, note) ; data hooks data-pay-dialog/-methods/-method/va-bank/va-number/va-copy/va-check/card-*/qris-*/pay-done
- TicketView.tsx: NEW amber ending-soon banner above the ivory pass when CHECKED_IN && 0<minsLeft≤30 (pulsing TriangleAlert, title+countdown, {slot}/{minutes} body, quick "Perpanjang +1 Jam" button — data-endsoon-banner/-extend)
- HomeView.tsx: NEW EndingSoonBanner above campus bar (same 30-min condition, own 30s tick, data-home-endsoon/-extend); extend from home adds +1h and removes the banner
- NotifCenter.tsx: useSessionAlerts — when a session first crosses the 30-min line (notif key end:<id> not yet present) it ALSO fires an in-app toast (warnToastEndSoon {minutes}), in addition to the existing session_end_soon notification
- ProfileView.tsx: avatar is now an upload button (data-avatar-btn) — file input accept png/jpeg/webp, ≤2MB validation with i18n errors, FileReader→data-URL→setAvatar; hover camera overlay + persistent camera badge; red X remove button (data-avatar-remove) only when a custom photo exists; initials fallback otherwise
- AuditView.tsx: ACTION_META +PROFILE_UPDATE (UserRoundPen, aProfileUpdate)
- SystemCards.tsx: changelog v17→v26 (9 releases)
- Tests: NEW test-v26.mts (30 checks: bank list/prefixes, VA determinism+fallback, grouping, Luhn ±, expiry ±, QRIS payload, i18n parity ID/EN); NEW e2e-v26.mjs (27 checks: VA flow incl. 8808 prefix + note VA BCA, card flow incl. invalid-empty + Luhn-reject + note Kartu •••• 4242, QRIS flow, ending-soon toast+notif+home banner+extend+ticket banner, avatar upload→state→audit→remove, 0 page errors); e2e-v25 wallet section updated for the dialog flow (QRIS path + txn note check); e2e-v24 changelog 8→9

Verification (all green):
- Unit: test-as 85/85, test-tier 15/15, test-ledger 28/28, test-v24 40/40, test-v25 16/16, test-v26 30/30
- tsc clean (src), eslint clean
- e2e: v21 PASS, v22 PASS, v23 PASS, v24 PASS, v25 PASS (updated), v26 27/27 — zero page errors
- VLM (glm-4.6v): va-number 9/10, card-form 10/10 (preview+filled inputs), qris 10/10, home-banner 9/10, ticket-banner 9/10, avatar 8/10 (re-shot clean — only pre-existing Scan-QR FAB overlay noted, not a v26 issue)

Stage Summary:
- v26 delivered the three requested features end-to-end: realistic multi-channel top-up (bank VA with real issuer prefixes + copyable 16-digit numbers, card with live preview and genuine Luhn/expiry validation, QRIS with scannable QR) where every method is recorded on the transaction and audit trail; a layered ending-soon alert (toast + notification + home banner + ticket banner, all at the 30-minute mark) with one-tap +1-hour extend from both home and ticket; and a full profile-photo upload flow (type/size validation, preview, remove, audit-logged). Changelog now v17→v26.
- Key artifacts: modified parking-data.ts, store.ts, WalletView.tsx (dialog added), TicketView.tsx, HomeView.tsx, NotifCenter.tsx, ProfileView.tsx, AuditView.tsx, SystemCards.tsx; NEW scripts/test-v26.mts, e2e-v26.mjs, vlm-v26-check.ts, vlm-v26-avatar2.ts, shot-v26-clean.mjs
- Screenshots: scripts/shots/v26-va-number.png, v26-card-form.png, v26-qris.png, v26-home-banner.png, v26-ticket-banner.png, v26-avatar.png, v26-avatar-clean.png
