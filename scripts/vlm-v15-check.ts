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
    '/home/z/my-project/scripts/shots/v15-qr-bk-card.png',
    'This is a printable QR parking-slot card for "BINUS @ Bekasi" (white card, dashed cut border). Expected: navy QR code on the left, "PARKIR BINUS" brand in blue at top right, big slot number "B-25", a "Kode: BKS-B-25" line, location text "BINUS @ Bekasi · Area Parkir", and a yellow badge "SCAN UNTUK CHECK-IN & KELUAR". Rate 1-10 and check: (1) all texts present and readable, (2) no text overflows or overlaps the QR, (3) QR is crisp with quiet zone, (4) professional signage look. Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v15-qr-as-pdf-p1-1.png',
    'This is page 1 of an A4 print sheet of QR parking-slot cards for BINUS @ Alam Sutera (8 cards in a 2x4 grid, dashed cut lines, cards contain QR + slot number + code like "AS-A-01"). Rate 1-10 and check: (1) grid alignment and consistent card sizes, (2) dashed cut guides visible, (3) slot numbers progress A-01..A-08, (4) footer line at page bottom, (5) any cropping/margin issues. Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v15-qr-bk-pdf-p7-7.png',
    'This is the LAST page (7 of 7) of an A4 print sheet of QR cards for BINUS @ Bekasi — 50 slots total, 48 already placed, so this page should hold only the remaining 2 cards (B-24, B-25) plus a footer "halaman 7/7". Rate 1-10 and check: (1) exactly 2 cards on this page, (2) cards aligned to the top grid positions, (3) footer present and correct, (4) no layout defects. Answer in 3-4 sentences.'
  );
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
