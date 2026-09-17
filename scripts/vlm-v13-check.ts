import ZAI, { VisionMessage } from 'z-ai-web-dev-sdk';
import { readFileSync } from 'fs';

async function ask(zai: any, file: string, prompt: string) {
  const b64 = readFileSync(file).toString('base64');
  const messages: VisionMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
      ],
    },
  ];
  const response = await zai.chat.completions.createVision({
    model: 'glm-4.6v',
    messages,
    thinking: { type: 'disabled' },
  });
  console.log(`=== ${file.split('/').pop()} ===`);
  console.log(response.choices?.[0]?.message?.content ?? 'NO REPLY');
  console.log();
}

async function main() {
  const zai = await ZAI.create();
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v13-as-map-full.png',
    'This is a full-screen parking map for "BINUS @ Alam Sutera · Area Parkir" (dark premium app, white site-plan card). Expected layout: an OPEN parking lot — Row A (20 bays) on top, a drive lane in the middle with a green MASUK gate box on the LEFT end and a KELUAR gate box on the RIGHT end, Row B (20 bays) below. Bays should be adjacent strips separated by THIN paint lines (no thick pillars, no walls), colored pastel by status (emerald free, amber booked, red occupied, slate maintenance). Rate 1-10 and check: (1) layout matches the open-lot design, (2) MASUK left / KELUAR right placement, (3) thin dividers visible between bays, no leftover walls/pillars, (4) readability of bay numbers. Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v13-as-home-compact.png',
    'This is a mobile home screen of a dark premium parking app with a compact white parking map card for the Alam Sutera campus (open lot: rows A and B of 20 bays each, thin paint-line dividers, MASUK gate left of the lane, KELUAR gate right). Rate 1-10: (1) is the compact open-lot map rendered correctly and readable? (2) does it visually differ from a walled building deck (no thick walls/pillars)? (3) any overflow, misalignment, or unreadable elements? Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v13-as-operator.png',
    'This is an operator "Command Center" (dark theme, BINUS yellow accents) scoped to the Alam Sutera campus. It should show: header chip "OPERATOR · ALAM SUTERA", stat tiles (13 in-building, 3 booked, 22 free, 2 maintenance), a "Harga Dinamis" card with NORMAL tier and Rp20.000/Rp30.000 prices plus an occupancy bar with 40/75% threshold ticks, and a live slot monitor grid with 40 slots. Rate 1-10 and check readability, alignment, and any defects. Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v13-as-qr-dialog.png',
    'This is a slot QR detail dialog in a dark premium parking app for the Alam Sutera campus. It should show: a large QR code on a white card, slot number "A-01" as the title, subtitle "BINUS @ Alam Sutera · Area Parkir", a "Kode slot: AS-A-01" row, a yellow scan hint, and a yellow "Unduh PNG" button. Rate 1-10: QR crispness, label readability, alignment, defects. Answer in 3-4 sentences.'
  );
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
