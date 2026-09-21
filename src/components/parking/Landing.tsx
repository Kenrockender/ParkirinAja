"use client";
/** Landing — clean dark premium hero with glow orbs + Microsoft SSO (BINUSIAN) & demo sign-in. */
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  CarFront,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
  X,
} from "lucide-react";
import { LogoMark } from "./Brand";
import { useParkir } from "@/lib/store";
import { tr } from "@/lib/parking-data";

/** Microsoft 4-square logo */
function MsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 23 23" className={className} aria-hidden>
      <rect x="1" y="1" width="10" height="10" fill="#f25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
      <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
      <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}

export function Landing() {
  const lang = useParkir((s) => s.lang);
  const signIn = useParkir((s) => s.signIn);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [msOpen, setMsOpen] = React.useState(false);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Glow orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-20%] h-96 w-96 rounded-full bg-binus-bright/25 blur-[110px] animate-float-slow" />
        <div className="absolute top-[38%] left-[-25%] h-[26rem] w-[26rem] rounded-full bg-primary/15 blur-[120px] animate-float-slow [animation-delay:-3s]" />
        <div className="absolute bottom-[-10%] right-[10%] h-72 w-72 rounded-full bg-binus-blue/40 blur-[100px]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-16">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative">
            <LogoMark size={84} />
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
          className="mt-14"
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

        {/* Sign-in */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="mt-auto pt-12"
        >
          <div className="glass rounded-3xl p-4">
            {/* Microsoft SSO — primary sign-in for BINUSIAN */}
            <button
              onClick={() => setMsOpen(true)}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-white text-sm font-bold text-[#1b1b1b] shadow-[0_10px_30px_-12px_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.01] active:scale-[0.98]"
            >
              <MsLogo className="h-4.5 w-4.5" />
              {t("msSignIn")}
            </button>

            <div className="my-3.5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("msOrDemo")}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

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

            {/* Operator sign-in */}
            <button
              onClick={() => signIn("operator")}
              className="group mt-2.5 flex w-full items-center gap-3 rounded-2xl border border-binus-bright/25 bg-binus-blue/25 px-3.5 py-3 text-left transition-all hover:bg-binus-blue/40 active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-binus-bright/15">
                <ShieldCheck className="h-4.5 w-4.5 text-binus-bright" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold">{t("signInOperator")}</span>
                <span className="block truncate text-[9px] text-muted-foreground">
                  {t("operatorShift")}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
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

      {/* Microsoft SSO simulated modal */}
      <AnimatePresence>
        {msOpen && (
          <MicrosoftModal
            open={msOpen}
            onClose={() => setMsOpen(false)}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Simulated Microsoft SSO sheet — white MS-style card, campus account pick. */
function MicrosoftModal({
  lang,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  lang: "id" | "en";
}) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const signIn = useParkir((s) => s.signIn);
  const [busy, setBusy] = React.useState(false);

  function go() {
    if (busy) return;
    setBusy(true);
    window.setTimeout(() => {
      signIn("microsoft");
      onClose();
    }, 950);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
      onClick={busy ? undefined : onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("msModalTitle")}
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-[#1b1b1b] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.7)]"
      >
        {!busy && (
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#616161] transition hover:bg-[#f3f2f1]"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <MsLogo className="h-7 w-7" />
        <h3 className="mt-4 text-xl font-semibold tracking-tight">{t("msModalTitle")}</h3>
        <p className="mt-1 text-[13px] text-[#616161]">{t("msModalFor")}</p>

        {/* campus account (demo) */}
        <button
          onClick={go}
          disabled={busy}
          className="mt-5 flex w-full items-center gap-3 rounded-xl border border-[#d1d1d1] bg-white p-3 text-left transition hover:bg-[#f3f2f1] disabled:cursor-default"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0067b8] text-xs font-bold text-white">
            AR
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">Alya Ramadhani</span>
            <span className="block truncate text-[11px] text-[#616161]">
              alya.ramadhani@binus.ac.id
            </span>
          </span>
          {busy ? (
            <span className="h-4.5 w-4.5 shrink-0 animate-spin rounded-full border-2 border-[#0067b8]/30 border-t-[#0067b8]" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[#a19f9d]" />
          )}
        </button>

        <button
          onClick={go}
          disabled={busy}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-lg bg-[#0067b8] text-sm font-semibold text-white transition hover:bg-[#005da6] active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? t("msWorking") : t("msContinue")}
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] font-medium text-[#a19f9d]">
          <BadgeCheck className="h-3 w-3 text-emerald-600" />
          {t("msDemoNote")}
        </p>
      </motion.div>
    </motion.div>
  );
}
