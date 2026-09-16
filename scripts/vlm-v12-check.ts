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
    '/home/z/my-project/scripts/shots/v12-map-white-home.png',
    'This is a mobile parking app (dark theme #070B16). The parking lot site plan card (slot grid, rows A/B with parking bays, entrance, drive lane) was just redesigned to have a WHITE background instead of dark. Rate 1-10 and check: (1) is the parking map card clearly white? (2) are slot numbers readable on white (emerald/amber/red/slate colors)? (3) any contrast issues, invisible text, or visual defects on the white card? Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v12-map-white-full.png',
    'This is a full-screen parking map overlay in a dark premium app. The site plan card inside should now be WHITE (like a paper blueprint on a dark desk): white card with slot bays in pastel colors (emerald available, amber reserved, red occupied, slate maintenance), light-gray walls/lane, blue LIFT and ramp tiles, violet WC tile, emerald ENTRANCE. Rate 1-10 and check: (1) white card contrast vs dark overlay, (2) readability of all labels and slot numbers, (3) any visual defects (invisible icons/text, broken layout). Answer in 3-4 sentences.'
  );
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
