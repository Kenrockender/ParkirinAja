# ParkirinAja Audit Report

**Audited commit:** `0e1597580abf6918085776d77263eba194b03f23` (`main`, synchronized with `origin/main` on 2026-10-22)

## Scope

- Next.js app shell, customer and operator-facing components, Zustand store, booking rules, PWA assets/service worker, configuration, tests, and mascot assets.
- Prisma and API scaffolding were reviewed without running database commands.
- The official mascot assets under `public/mascot/` were inspected and retained.

## Findings and fixes

| Severity | Finding | Root cause | Fix |
|---|---|---|---|
| Critical | `.env` was committed despite the ignore rule. | The file was already tracked, so a later `.gitignore` rule could not protect it. | Removed `.env` from Git tracking while retaining the local file; added `.env.example` with a placeholder only. Rotate the database credential before the next deployment because it existed in Git history. |
| High | Two overlapping reservations could be created for the same slot. | `book()` trusted the form and checked wallet/EV eligibility only. | The store now validates the slot, vehicle, time window, user eligibility, maintenance/occupancy state, and conflicting reservations before charging the wallet. |
| High | Confirmed tickets, history, and wallet could be lost after a browser refresh. | The preview Zustand store was memory-only. | Persisted non-transient customer/demo state in browser local storage. Toasts and live-stream state remain transient. |
| High | A camera stream could survive after the scanner closed while `getUserMedia()` was still resolving. | The old scanner had no request/session cancellation guard. | Added camera session and active-state guards, stops late streams, cancels decode timers, and prevents post-close scan loops. |
| Medium | TypeScript errors could be silently shipped. | `next.config.ts` set `ignoreBuildErrors: true`. | Removed that bypass; `tsc --noEmit` now validates the project. |
| Medium | PWA shortcut URLs were not handled and referenced icons were missing. | Manifest and page behavior were disconnected. | Generated both shortcut icons, wired `?action=scan` and `?action=wallet` to existing flows, and removed a manifest screenshot reference to a missing asset. |
| Low | Forecast cache mutated module-level state from a component. | The prediction strip wrote into a shared object during render memoization. | The forecast is now computed once per mounted Home view without mutating module state. |

## Security review

- No secret values are reproduced in this report.
- `.env` contains a database configuration key and was tracked. It is now ignored/untracked locally; **rotate the old database URL/credential** before publishing another deployment.
- No destructive database command (`db:push`, `db:migrate`, or `db:reset`) was run.
- The current app is a client-side simulation. `src/app/api/route.ts` is a placeholder endpoint and the Prisma schema is not the data source for the customer flow. The UI must not be presented as a live production parking system.

## PWA review

- The service worker uses versioned caches and network-first navigation, preventing an old app shell from masking updated UI.
- The local PWA shortcut assets now exist and their destination actions work in the client shell.
- The manifest parses successfully after removal of the missing screenshot reference.

## Testing record

| Check | Result | Notes |
|---|---|---|
| `bun test` | Passed | 2 focused reservation-rule tests, 0 failures. |
| `bunx tsc --noEmit` | Passed | Includes Bun test typings. |
| `bunx eslint . --max-warnings 0` | Passed | No lint errors or warnings. |
| `Invoke-WebRequest http://localhost:3000` | Passed | Existing local dev server returned HTTP 200 and ParkirinAja markup. |
| Production build after final edits | Not run | An existing `next dev` process owns Next's build lock. It was not stopped because it may be the user's active preview. |

## Outstanding items

- A production build should be run once the active development server has stopped: `bun run build`.
- The local-storage persistence is appropriate for this prototype only. Real user identity, reservations, payments, and authorization still require a server-backed API and database integration.
- Existing shell tests under `tests/` reference deleted `.zscripts` deployment helpers; they were not executed because they are not applicable to the current Next.js project and would fail before exercising app behavior.
