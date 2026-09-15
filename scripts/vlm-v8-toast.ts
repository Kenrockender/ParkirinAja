import ZAI, { VisionMessage } from 'z-ai-web-dev-sdk';
import { readFileSync } from 'fs';

async function main() {
  const zai = await ZAI.create();
  const b64 = readFileSync('/home/z/my-project/scripts/shots/v8-08-max2-blocked.png').toString('base64');
  const messages: VisionMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'This is a QR scanner screen in a parking app. There should be an error toast at the top saying the parking limit was reached (max 2 vehicles at once). Is the toast clearly visible and readable? Any layout issues? Answer in 2-3 sentences.' },
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
