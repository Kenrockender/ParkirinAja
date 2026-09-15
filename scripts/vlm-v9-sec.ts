import ZAI, { VisionMessage } from 'z-ai-web-dev-sdk';
import { readFileSync } from 'fs';
async function main() {
  const zai = await ZAI.create();
  const b64 = readFileSync('/home/z/my-project/scripts/shots/v9-04-qr-section-top.png').toString('base64');
  const messages: VisionMessage[] = [
    { role: 'user', content: [
      { type: 'text', text: 'Operator console section "QR Slot Parkir" in a dark premium app. Verify visible: section header with QR icon + title + "32" yellow chip, subtitle, a yellow "Cetak Semua · A4 · 4 halaman · 8 kartu per halaman" button, and a 3-column grid of white QR cards with slot labels. Rate 1-10, note any defects. 2-3 sentences.' },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
    ]},
  ];
  const r = await zai.chat.completions.createVision({ model: 'glm-4.6v', messages, thinking: { type: 'disabled' } });
  console.log(r.choices?.[0]?.message?.content ?? 'NO REPLY');
}
main().catch((e) => { console.error(e?.message || e); process.exit(1); });
