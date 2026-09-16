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
    '/home/z/my-project/scripts/shots/v12-map-dark.png',
    'This is a mobile parking app in DARK mode (deep navy theme). The parking site plan card must now be DARK navy (not white): slot bays with translucent emerald/amber/red tints and light-colored slot numbers, subtle white-tinted walls, dark drive lane. Rate 1-10 and answer: (1) is the map card dark, matching the app theme? (2) are all slot numbers and labels readable? (3) any leftover WHITE surfaces inside the map or contrast defects? Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v12-map-light.png',
    'This is the same parking app switched to LIGHT mode. The parking site plan card must be WHITE with pastel slot colors and dark ink text. Rate 1-10 and answer: (1) is the map card white and consistent with light mode? (2) readable slot numbers/labels? (3) any leftover DARK surfaces inside the map or contrast defects? Answer in 3-4 sentences.'
  );
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
