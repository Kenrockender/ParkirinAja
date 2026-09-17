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
    '/home/z/my-project/scripts/shots/v14-bk-map.png',
    'This is a parking map for "BINUS @ Bekasi · Area Parkir" (dark premium app, white site-plan card). Expected layout: an OPEN parking lot — Row A (25 bays) on top, a drive lane in the middle with a green MASUK gate box on the LEFT end and a KELUAR gate box on the RIGHT end, Row B (25 bays) below. Bays should be adjacent strips separated by THIN paint lines (no thick pillars, no walls), colored pastel by status (emerald free, amber booked, red occupied, slate maintenance). Rate 1-10 and check: (1) layout matches the open-lot design, (2) MASUK left / KELUAR right placement, (3) thin dividers visible between bays, no leftover walls/pillars, (4) readability of bay numbers. Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v14-bk-home-en.png',
    'This is a mobile home screen of a dark premium parking app in ENGLISH for the BINUS @ Bekasi campus. It should show: campus chip "BINUS @ Bekasi / Kota Bekasi", an availability hero with "22/40" style free-slot count (numbers may differ), a compact white open-lot map card (rows A and B of bays with thin paint-line dividers), and English labels ("Find a slot", "Select Campus", "slots free"). Rate 1-10: (1) all visible labels in English, no Indonesian leftovers like "Pilih Kampus"/"Cari Slot", (2) compact open-lot map rendered correctly, (3) any overflow, misalignment, or unreadable elements? Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v14-bk-qr-dialog.png',
    'This is a slot QR detail dialog in a dark premium parking app for the BINUS @ Bekasi campus. It should show: a large QR code on a white card, a slot title, subtitle/location "BINUS @ Bekasi · Area Parkir", a slot code row with prefix "BKS-" (e.g. BKS-A-01), a scan hint, and a download button. Rate 1-10: QR crispness, label readability, alignment, defects. Answer in 3-4 sentences.'
  );
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
