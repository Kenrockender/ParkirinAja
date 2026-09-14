"use client";
/** Landing — dark premium hero with glow orbs, feature glass cards, demo sign-in. */
import React from "react";
import { motion } from "framer-motion";
import { GraduationCap, MapPinned, QrCode, Sparkles, Wallet, ChevronRight, CarFront } from "lucide-react";
import { LogoMark } from "./Brand";
import { useParkir } from "@/lib/store";
import { tr } from "@/lib/parking-data";

export function Landing() {
  const lang = useParkir((s) => s.lang);
  const signIn = useParkir((s) => s.signIn);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const features = [
    {
      icon: MapPinned,
      title: lang === "id" ? "Slot persis di site-plan" : "Slots match the site-plan",
      desc:
        lang === "id"
          ? "Pilih nomor slot favoritmu di Gedung Parkir Anggrek"
          : "Pick your favorite slot number at Anggrek Parking Building",
      accent: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
    },
    {
      icon: QrCode,
      title: lang === "id" ? "Scan QR dari HP" : "Scan the QR from your phone",
      desc:
        lang === "id"
          ? "Check-in & keluar cukup scan QR permanen di tiap slot"
          : "Check in & out by scanning the permanent QR at each slot",
      accent: "text-primary bg-primary/10 border-primary/25",
    },
    {
      icon: Sparkles,
      title: lang === "id" ? "Heatmap permintaan" : "Demand heatmap",
      desc:
        lang === "id"
          ? "Lihat jam & hari paling padat sebelum berangkat"
          : "See the busiest hours & days before you leave",
      accent: "text-sky-300 bg-sky-400/10 border-sky-400/20",
    },
    {
      icon: Wallet,
      title: lang === "id" ? "Dompet & refund jelas" : "Wallet & fair refunds",
      desc:
        lang === "id"
          ? "Refund 100% dalam 10 menit pertama, otomatis"
          : "100% refund in the first 10 minutes, automatic",
      accent: "text-violet-300 bg-violet-400/10 border-violet-400/20",
    },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Glow orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-20%] h-96 w-96 rounded-full bg-binus-bright/25 blur-[110px] animate-float-slow" />
        <div className="absolute top-[38%] left-[-25%] h-[26rem] w-[26rem] rounded-full bg-primary/15 blur-[120px] animate-float-slow [animation-delay:-3s]" />
        <div className="absolute bottom-[-10%] right-[10%] h-72 w-72 rounded-full bg-binus-blue/40 blur-[100px]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-14">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative">
            <LogoMark size={76} />
            <span className="absolute -right-2 -top-1 rounded-full bg-emerald-400/90 px-1.5 py-px text-[8px] font-black tracking-wide text-emerald-950">
              v4
            </span>
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">
            {t("appName")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("tagline")}</p>
        </motion.div>

        {/* Hero copy */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-9"
        >
          <h2 className="font-display text-[2.6rem] font-bold leading-[1.04] tracking-tight">
            {lang === "id" ? (
              <>
                Parkir tanpa <span className="text-gradient-gold">drama.</span>
              </>
            ) : (
              <>
                Parking, minus <br /> the <span className="text-gradient-gold">drama.</span>
              </>
            )}
          </h2>
          <p className="mt-3 max-w-[32ch] text-[15px] leading-relaxed text-muted-foreground">
            {t("heroSub")}
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 space-y-2.5"
        >
          {features.map((f, i) => (
            <div
              key={i}
              className="glass lift group flex items-center gap-3.5 rounded-2xl p-3.5"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${f.accent}`}
              >
                <f.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{f.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{f.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
            </div>
          ))}
        </motion.div>

        {/* Sign-in */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="mt-auto pt-10"
        >
          <div className="glass rounded-3xl p-4">
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("demoAccounts")}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => signIn("student")}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-3 py-4 transition-all hover:bg-primary/15 hover:shadow-[0_0_28px_-6px_rgba(255,214,10,0.35)] active:scale-[0.97]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
                  <GraduationCap className="h-4.5 w-4.5 text-primary" />
                </span>
                <span className="text-xs font-bold">{t("student")}</span>
                <span className="text-[9px] text-muted-foreground">@binus.ac.id</span>
              </button>
              <button
                onClick={() => signIn("general")}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card/50 px-3 py-4 transition-all hover:border-binus-bright/40 hover:bg-accent/50 active:scale-[0.97]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-binus-bright/15">
                  <CarFront className="h-4.5 w-4.5 text-binus-bright" />
                </span>
                <span className="text-xs font-bold">{t("general")}</span>
                <span className="text-[9px] text-muted-foreground">guest@gmail.com</span>
              </button>
            </div>
            <button
              onClick={() => signIn("student")}
              className="glow-primary mt-3 flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.98]"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.75 12 .75 7.9.75 4.26 3.1 2.5 6.56l3.66 2.84C6.99 6.87 9.23 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.25 12.26c0-.92-.08-1.6-.26-2.31H12v4.19h6.44c-.13 1.08-.83 2.7-2.39 3.79l3.57 2.77c2.14-1.98 3.63-4.89 3.63-8.44z"
                />
                <path fill="#FBBC05" d="M6.16 14.6c-.25-.74-.39-1.53-.39-2.35s.14-1.61.38-2.35L2.5 7.06C1.7 8.66 1.25 10.3 1.25 12.25s.45 3.59 1.25 5.19l3.66-2.84z" />
                <path fill="#34A853" d="M12 23.75c3.04 0 5.6-1 7.46-2.73l-3.57-2.77c-.95.66-2.23 1.12-3.89 1.12-2.77 0-5.01-1.83-5.84-4.36l-3.66 2.84c1.76 3.46 5.4 5.9 9.5 5.9z" />
              </svg>
              {t("signIn")}
            </button>
            <p className="mt-2.5 text-center text-[10px] leading-snug text-muted-foreground">
              {t("signInNote")}
            </p>
          </div>
          <p className="mt-4 text-center text-[10px] text-muted-foreground/70">
            {t("footerNote")} · BINUS @ Kemanggisan
          </p>
        </motion.div>
      </main>
    </div>
  );
}
