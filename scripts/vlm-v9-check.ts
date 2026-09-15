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
    '/home/z/my-project/scripts/shots/v9-01-qr-section.png',
    'This is the "QR Slot Parkir" section in a parking operator console (dark premium theme, BINUS yellow #FFD60A). It should show: section header with QR icon + "32" chip, a yellow "Cetak Semua" print button, and a grid of QR code cards each labeled with a slot number (A-01..A-18, B-01..B-14). Rate 1-10 and check: QR codes crisp and scannable-looking, labels readable, grid alignment, any visual defects? Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v9-02-qr-dialog.png',
    'This is a slot QR detail dialog in a dark premium parking app. It should show: a large QR on white card, slot number "A-01" as title, location subtitle, a "Kode slot: PB-A-01" row, a yellow scan hint note, and a yellow "Unduh PNG" button. Rate 1-10, check readability, alignment, contrast, any defects. Answer in 3-4 sentences.'
  );
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
