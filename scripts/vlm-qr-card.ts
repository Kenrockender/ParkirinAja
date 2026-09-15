import ZAI, { VisionMessage } from 'z-ai-web-dev-sdk';
import { readFileSync } from 'fs';

async function main() {
  const zai = await ZAI.create();
  const b64 = readFileSync('/home/z/my-project/download/qr-slot/PNG/QR-A-01.png').toString('base64');
  const messages: VisionMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'This is a printable QR sign card for a parking slot in a campus parking app (BINUS brand: navy #070B16, blue #1E3A8A, yellow #FFD60A). It should show: brand "PARKIR BINUS", a big slot number "A-01", code "PB-A-01", location text, a yellow badge, and a scannable QR on the left inside a dashed cut border. Rate the design quality 1-10 and check: any text overflow/clipping, alignment issues, contrast problems, or layout defects? Answer in 3-4 sentences.' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
      ],
    },
  ];
  const response = await zai.chat.completions.createVision({
    model: 'glm-4.6v',
    messages,
    thinking: { type: 'disabled' },
  });
  console.log(response.choices?.[0]?.message?.content ?? 'NO REPLY');
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
