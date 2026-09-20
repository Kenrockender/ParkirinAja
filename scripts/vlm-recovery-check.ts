/**
 * vlm-recovery-check.ts — visual QA of the v22–v26 recovery build screenshots.
 * Run: bun scripts/vlm-recovery-check.ts
 */
import ZAI, { VisionMessage } from "z-ai-web-dev-sdk";
import { readFileSync } from "fs";

async function ask(zai: any, file: string, prompt: string) {
  const b64 = readFileSync(file).toString("base64");
  const messages: VisionMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } },
      ],
    },
  ];
  const response = await zai.chat.completions.createVision({
    model: "glm-4.6v",
    messages,
    thinking: { type: "disabled" },
  });
  console.log(`=== ${file.split("/").pop()} ===`);
  console.log(response.choices?.[0]?.message?.content ?? "NO REPLY");
  console.log();
}

async function main() {
  const zai = await ZAI.create();
  const S = "/home/z/my-project/scripts/shots";

  await ask(
    zai,
    `${S}/recovery-ticket-ivory.png`,
    'Tiket parkir "boarding pass" harusnya krem/ivory TERANG (#faf6e9), teks tinta gelap, nomor slot besar biru, QR putih, kode booking jelas — BUKAN gelap/hitam. Apakah tiket terang & mudah dibaca? Ada teks "Biaya parkir"? Rate 1-10, jawab 2-3 kalimat.'
  );

  await ask(
    zai,
    `${S}/recovery-va-number.png`,
    "Dialog pembayaran Virtual Account: nomor VA 16 digit terformat 4-4-4-4 (awalan 8808 BCA), tombol Salin, jumlah, masa berlaku, instruksi m-banking. Apakah semua elemen jelas & rapi? Rate 1-10, 2-3 kalimat."
  );

  await ask(
    zai,
    `${S}/recovery-map-live.png`,
    "Peta parkir lengkap dengan stream LIVE aktif: pill LIVE merah dengan latensi ms, ticker event dengan plat nomor TER-MASK (ada titik •), tile tamu live dengan cincin kuning berdenyut, blok RAMP L2 besar menyatu (bukan celah). Rate 1-10 dan konfirmasi 3 hal itu terlihat. 2-3 kalimat."
  );

  await ask(
    zai,
    `${S}/recovery-operator-analitik.png`,
    "Tab Analitik operator: 4 KPI chip, heatmap okupansi 7×15 dengan gradasi warna, grafik forecast dengan garis aktual hijau + proyeksi kuning + pita, model card dengan MAPE. Rate 1-10, apakah terlihat profesional tanpa overflow? 2-3 kalimat."
  );

  await ask(
    zai,
    `${S}/recovery-operator-keuangan-invoice.png`,
    "Tab Keuangan operator: dialog faktur dengan stempel LUNAS, rincian DPP/PPN 11%/Total, dan di belakangnya kartu jurnal ganda + neraca saldo SEIMBANG. Rate 1-10, 2-3 kalimat."
  );

  await ask(
    zai,
    `${S}/recovery-home-endsoon.png`,
    "Beranda pelanggan dengan banner peringatan AMBER 'Waktu parkir hampir habis' + countdown menit + tombol perpanjang, dan greeting bersih TANPA badge kecil di samping nama. Rate 1-10, 2-3 kalimat."
  );

  console.log("VLM checks done.");
}

main().catch((e) => {
  console.error("VLM check failed:", e);
  process.exit(1);
});
