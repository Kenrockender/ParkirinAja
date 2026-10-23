# Feature Recommendations

These are intentionally **not** implemented in the current audit. They require a product decision or a real backend rather than another front-end-only simulation.

| Feature | Reason | Expected benefit | Priority | Complexity |
|---|---|---|---|---|
| Server-backed reservations | Current reservation state is browser-local simulation only. | Prevents cross-device double booking and provides an authoritative history. | P0 | High |
| Real authentication and authorization | Current sign-in is demo persona selection. | Protects customer data and operator-only tools. | P0 | High |
| Reservation API concurrency control | Client-side checks cannot coordinate multiple users. | Guarantees a slot cannot be booked simultaneously by different devices. | P0 | High |
| Service-worker update banner | The worker now updates safely, but users receive no visible “new version ready” message. | Clearer releases without stale tabs. | P1 | Low |
| Camera scanner integration test | Camera behavior requires physical permission/device coverage. | Confirms QR decoding across Android, iOS, and desktop cameras. | P1 | Medium |
| Accessibility audit with screen reader | Keyboard labels are present in key flows but no assistive-technology test has been run. | Better usability and WCAG confidence. | P1 | Medium |
| Production error monitoring | Runtime failures are currently local console output only. | Faster diagnosis after deployment. | P1 | Medium |
| Dedicated mascot asset variants | Existing official poses cover success, guidance, cancellation, and feature help. | Consistent empty/loading/error states without inventing artwork. | P2 | Low |
