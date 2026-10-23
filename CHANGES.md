# Change Log — 2026-10-22

## Bug Fixes

| No | File | Problem | Fix | Status |
|---:|---|---|---|---|
| 1 | `src/lib/store.ts` | Booking could bypass slot availability and overlap checks. | Added store-level slot, vehicle, time-window, eligibility, and availability validation. | Done |
| 2 | `src/components/parking/BookingView.tsx` | A rejected booking always implied insufficient balance. | Shows an accurate slot/time-unavailable message after store rejection. | Done |
| 3 | `src/components/parking/ScannerView.tsx` | Late camera permission results could leave camera/decoder running. | Added session invalidation and safe camera/timer cleanup. | Done |
| 4 | `next.config.ts` | Production build skipped TypeScript errors. | Restored TypeScript validation. | Done |
| 5 | `src/components/parking/HomeView.tsx` | Component mutated global forecast cache. | Uses a component-local memoized forecast. | Done |
| 6 | `src/app/page.tsx`, `public/manifest.json` | PWA shortcuts did not perform their advertised actions. | Added URL action handling and corrected manifest assets. | Done |

## UI/UX Improvements

| No | Page | Previous Issue | Improvement |
|---:|---|---|---|
| 1 | Home/PWA entry | Home-screen shortcuts opened the generic app only. | Scan opens the scanner; Wallet opens the wallet tab, then removes the one-time query parameter. |
| 2 | Booking | A collision could look like a balance error. | User receives a clear recovery message to choose another slot/time. |

## Mascot Integrations

| No | Page | Mascot State | Animation | Trigger |
|---:|---|---|---|---|
| 1 | Reservation success | Official mascot car | HyperFrames WebM success sequence | Successful booking only |
| 2 | Ticket cancellation | Sad official mascot | Gentle floating motion | Cancellation confirmation |
| 3 | Wayfinding | Mascot car | Drives along the route and parks on arrival | Open route guidance |
| 4 | Feature Knowledge | Thumbs-up official mascot | Subtle corner idle motion | Open feature guide |

## New Features

| No | Feature | Description | Status |
|---:|---|---|---|
| 1 | Reservation rule tests | Automated checks for overlap rejection and valid booking success. | Done |
| 2 | Browser-state persistence | Customer prototype state survives a page refresh. | Done |
| 3 | PWA quick actions | Functional Scan and Wallet app shortcuts. | Done |

## Modified Files

| No | File Path | Modification |
|---:|---|---|
| 1 | `.gitignore` | Allows only the safe `.env.example` template. |
| 2 | `eslint.config.mjs` | Aligns React Compiler lint policy with existing transient dialog initialization patterns. |
| 3 | `next.config.ts` | Re-enables build-time TypeScript checks. |
| 4 | `package.json` | Adds `bun test`. |
| 5 | `public/manifest.json` | Removes missing screenshot declaration. |
| 6 | `src/app/page.tsx` | Handles PWA shortcut actions. |
| 7 | `src/components/parking/BookingView.tsx` | Accurate failed-booking feedback. |
| 8 | `src/components/parking/HomeView.tsx` | Removes global forecast mutation. |
| 9 | `src/components/parking/ScannerView.tsx` | Makes camera lifecycle safe. |
| 10 | `src/lib/store.ts` | Adds reservation guardrails and browser persistence. |
| 11 | `tsconfig.json` | Includes Bun test typings. |
| 12 | `src/components/parking/AnprConsole.tsx` | Removes an obsolete lint suppression. |
| 13 | `src/components/parking/EvVerification.tsx` | Removes obsolete lint suppressions. |
| 14 | `src/components/parking/NotifCenter.tsx` | Removes an obsolete lint suppression. |
| 15 | `public/icons/icon-*.png` | Preserved the approved ParkirinAja PWA logo assets; the generator now produces only utility shortcut icons. |

## New Files

| No | File Path | Purpose |
|---:|---|---|
| 1 | `.env.example` | Safe environment variable template. |
| 2 | `tests/reservation-rules.test.ts` | Focused booking integrity tests. |
| 3 | `public/icons/scan-shortcut.png` | PWA Scan shortcut icon. |
| 4 | `public/icons/wallet-shortcut.png` | PWA Wallet shortcut icon. |
| 5 | `AUDIT_REPORT.md` | Findings, risks, and verification record. |
| 6 | `CHANGES.md` | This implementation change log. |
| 7 | `FEATURE_RECOMMENDATIONS.md` | Deferred, high-value enhancements. |
