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
    '/home/z/my-project/scripts/shots/v16-notif-sheet.png',
    'This is a notification center sheet (right-side slide-in panel, dark premium theme, BINUS yellow accents) in an Indonesian parking app. Expected: header "Notifikasi" with count badge, action buttons "Tandai dibaca" & "Hapus semua", and a list of notification cards — each with a colored icon chip, bold title, time-ago label, and body text (items like "Sesi parkir dimulai", "Booking dikonfirmasi", "Promo kampus", "Selamat datang"). Rate 1-10 and check: (1) cards readable with clear hierarchy, (2) icon chips and unread dots visible, (3) no overflow/misalignment, (4) professional look. Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v16-ticket-extend.png',
    'This is an active parking ticket screen (dark premium app, Indonesian). Expected: boarding-pass style card with yellow top band, slot number, session timer, and action buttons: primary yellow "Keluar & Bayar Parkir" plus a secondary outlined "Perpanjang +1 Jam" button with a small hint line below it about Rp5.000/jam. Rate 1-10 and check: (1) both buttons present and readable, (2) hint text legible, (3) layout balanced, no defects. Answer in 3-4 sentences.'
  );
  await ask(
    zai,
    '/home/z/my-project/scripts/shots/v16-op-csv.png',
    'This is an operator "Command Center" history tab (dark theme, yellow accents, Indonesian) for a campus parking console. Expected: recap cards ("Ringkasan Hari Ini"), completed sessions card, and a "Log Transaksi" card whose header has a count chip and an "Ekspor CSV" button with a download icon. Rate 1-10 and check: (1) the Ekspor CSV button is visible and readable, (2) stat cards aligned, (3) any overflow or defects. Answer in 3-4 sentences.'
  );
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
