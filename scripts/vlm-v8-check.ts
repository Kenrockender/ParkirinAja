import ZAI, { VisionMessage } from 'z-ai-web-dev-sdk';
import { readFileSync } from 'fs';

async function review(file: string, prompt: string) {
  const zai = await ZAI.create();
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
  const reply = response.choices?.[0]?.message?.content;
  console.log(`\n===== ${file.split('/').pop()} =====`);
  console.log(reply ?? 'NO REPLY');
}

async function main() {
  const base = '/home/z/my-project/scripts/shots';
  await review(`${base}/v8-02-ms-modal.png`,
    'This is a mobile app landing page with an opened Microsoft SSO sign-in modal (white card, Microsoft logo, account picker, Continue button). Rate the visual quality 1-10 and check: (1) is the modal well-centered and legible, (2) does it look like a credible Microsoft-style sign-in card, (3) any layout glitches, overflow, or contrast problems? Be concise.');
  await review(`${base}/v8-04-search-map-result.png`,
    'This is a mobile parking app home screen. After pressing "Cari Slot", the availability RESULT should be a parking map (seat-map style slot grid with entrance/lane/exit), NOT text lists of slot numbers. Check: (1) is the parking map shown directly under the search results summary, (2) is there a legend below the map, (3) any confusing text lists of slot numbers still visible, (4) overall polish 1-10. Be concise.');
  await review(`${base}/v8-13-booking-guest-locked.png`,
    'This is a booking screen for a NON-BINUSIAN guest user. The "Advance" booking card should appear locked/dimmed with a lock icon and "Khusus BINUSIAN" note, while "Walk-in" is selected. There should be an info banner explaining guests can still park via QR scan. Verify both, rate polish 1-10, note any glitches. Be concise.');
  await review(`${base}/v8-08-max2-blocked.png`,
    'This screen should show an error toast "Batas tercapai — maksimal 2 kendaraan sedang parkir" (limit reached - max 2 vehicles parked). Is the toast visible and readable? Any layout issues? Be concise.');
  await review(`${base}/v8-14-light-profile.png`,
    'This is the profile screen in LIGHT mode for a non-BINUSIAN user. Check: (1) is the NON-BINUSIAN badge visible, (2) does the Preferences card contain ONLY language and dark-mode rows (no wallet row), (3) light mode contrast and polish 1-10. Be concise.');
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
