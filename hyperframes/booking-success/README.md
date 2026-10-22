# ParkirinAja — reservation success

A deterministic HyperFrames composition for the ParkirinAja booking-success state.

- Canvas: 1080 × 1920 (portrait 9:16)
- Duration: 4.5 seconds
- Frame rate: 30 fps
- Background: transparent
- Artwork: `assets/parkirinaja-car.png` (the supplied original car illustration)

## Source

- `index.html` contains the composition markup and paused GSAP timeline required by HyperFrames.
- `styles.css` contains the transparent, mobile-first layout.
- The image path is configurable before the composition loads:

```js
window.PARKIRINAJA_ASSETS = { car: "./assets/parkirinaja-car.png" };
```

The car is only translated, faded, and uniformly scaled as a whole; it is never stretched or deformed. Exhaust puffs, subtle success accents, and the final text-free liquid return wipe are DOM/CSS elements with deterministic GSAP timing.

## Preview

From this folder, run:

```powershell
hyperframes preview
```

Open the Studio URL printed by the command. Changes to `index.html` or `styles.css` reload automatically.

## Validate

```powershell
hyperframes lint --json
hyperframes check --json
hyperframes snapshot --at 0.15,0.8,1.55,3.5,4.2
```

## Render with alpha

```powershell
hyperframes render --format webm --output renders/parkirinaja-reservation-success-transparent.webm --fps 30
hyperframes render --format mov --output renders/parkirinaja-reservation-success-prores4444.mov --fps 30 --quality delivery
```

The WebM is suitable for browser playback. The ProRes 4444 MOV is for editors that need an alpha channel. Do not use H.264 MP4 when transparency is required.

## Delivered renders

- `renders/parkirinaja-reservation-success-transparent.webm` — VP9 with alpha
- `renders/parkirinaja-reservation-success-prores4444.mov` — ProRes 4444 with alpha
