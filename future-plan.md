# ParkirinAja — Future Visual Direction

## Purpose

Evolve ParkirinAja into a more memorable parking-reservation experience with an original 3D miniature visual world. The reference is the feeling of the KENNETH parking app: a polished vehicle, miniature buildings, strong lighting, and clear location context. ParkirinAja must keep its own brand, mascot, assets, and interaction design.

## Visual Direction

- **Style:** friendly 3D miniature / toy-like illustration, with rounded forms, soft shadows, controlled highlights, and a small amount of depth of field.
- **Mood:** modern, helpful, and energetic rather than overly game-like.
- **Map:** dark, low-contrast map surface so availability markers, route states, and the primary action remain easy to scan.
- **Colour system:** ParkirinAja’s existing colours remain the source of truth. The 3D art supports the UI; it does not replace the information hierarchy.
- **Originality:** do not copy the reference application’s cars, buildings, mascot, icons, layouts, or assets. All artwork should be custom-created for ParkirinAja.

## Reusable 3D Visual Kit

Build a small, reusable asset library instead of a separate illustration for every screen.

| Asset | Role | First version |
| --- | --- | --- |
| ParkirinAja car mascot | Main vehicle and motion hero | Existing mascot evolved into a polished 3D-styled vehicle with readable wheels, lights, and shadow |
| Parking building | Makes each location tangible | Original campus/parking building, starting with an Anggrek-inspired landmark only after the direction is approved |
| Road and parking bay | Connects vehicle to a reservation | Short curved road, lane markings, reserved slot, entry barrier, and P sign |
| Environment | Gives scale without clutter | Trees, lights, wayfinding signs, pavement, and small props |
| Status language | Communicates state at a glance | Green/amber/red availability, selected-slot glow, route line, and occupancy badge |

The kit should work on mobile first and be exported in a few sizes: a compact location thumbnail, a full-screen animation composition, and transparent foreground elements where needed.

## Where It Appears

### 1. Location discovery and detail

- A small isometric building thumbnail appears in the selected-location sheet.
- The building is a visual landmark only; live parking availability stays as text, chips, and accessible colour-coded markers.
- Selecting a location can reveal a small parking-zone illustration, not a heavy real-time 3D scene.

### 2. Booking success

- Start with the selected building and a highlighted reserved bay.
- The ParkirinAja car enters the small road, moves into the bay, and lands with a restrained smoke puff.
- Finish with the real slot number, booking code, and receipt summary. The animation should celebrate the result without delaying access to the ticket.

### 3. Parking exit

- Show the confirmed payment/result first.
- The barrier lifts, the car drives out from the occupied bay, and the building recedes behind it.
- Finish on the actual receipt summary, including duration and final amount.

### 4. Future home-map enhancement

- Use the dark-map approach only after the core booking flow is stable.
- Add original building markers gradually, beginning with a small number of partner/campus locations.
- Keep the map fast: location markers and list information must still load and remain usable without 3D media.

## HyperFrames Plan

HyperFrames is best used as the motion-design and MP4 rendering workspace, not as the runtime UI engine for the web app.

1. Create a short, vertical 9:16 composition for **booking success**.
2. Create a second short, vertical 9:16 composition for **parking exit**.
3. Each composition uses deterministic, seekable animation: no autoplay loops that make rendered frames inconsistent.
4. Preview and approve key frames before rendering: opening, car movement, arrival/exit, and receipt end card.
5. Render MP4 versions for presentations, portfolio/demo material, and social media.
6. Keep the app animation lightweight and interactive with its native web animation approach; reuse the same original visual assets, but do not embed a heavy video where a responsive UI animation is better.

## Delivery Sequence

1. Approve the art direction: 3D cute vs. 3D premium, building style, and palette.
2. Design one original hero scene: car, road, reserved bay, and one campus/parking building.
3. Create still key frames and review them before motion work.
4. Turn the approved scene into the booking-success and parking-exit animations.
5. Build the matching HyperFrames compositions and render demo MP4s.
6. Add the location-detail building thumbnail.
7. Evaluate a broader dark-map/home-screen redesign only after user testing and performance checks.

## Quality Bar

- A user can understand the booking or exit result even if the animation is skipped or motion is reduced.
- The actual reservation data (location, bay, code, amount) always wins over decorative imagery.
- All visual assets are original and licensed for the project.
- Transparent assets have clean edges; no black/white background halo.
- The mobile experience stays responsive, readable, and performant on mid-range devices.
- HyperFrames renders are reviewed at the start, mid-point, and final frame before approval.

## Decisions Needed Before Production

1. Should the target feel **cute 3D miniature** or **premium semi-realistic 3D**?
2. Should the first landmark be an **Anggrek-inspired campus building** or a **generic ParkirinAja parking building**?
3. Do we use the dark map as a future visual direction, or keep the current map treatment and limit this work to locations and animations?
4. Which use is most important for the first rendered HyperFrames MP4: venture presentation, in-app demo, or social-media teaser?
