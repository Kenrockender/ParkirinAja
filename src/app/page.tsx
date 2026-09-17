"use client";
/**
 * Parkir Binus — Dark Premium UI Concept v8
 * Live preview app: full customer journey on simulated data.
 */
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  ArrowLeftRight,
  CheckCircle2,
  History as HistoryIcon,
  Info,
  MapPin,
  Moon,
  Sun,
  UserRound,
  Wallet as WalletIcon,
  XCircle,
} from "lucide-react";
import { LogoMark } from "@/components/parking/Brand";
import { Landing } from "@/components/parking/Landing";
import { HomeView } from "@/components/parking/HomeView";
import { BookingView } from "@/components/parking/BookingView";
import { TicketView } from "@/components/parking/TicketView";
import { HistoryView } from "@/components/parking/HistoryView";
import { WalletView } from "@/components/parking/WalletView";
import { ProfileView } from "@/components/parking/ProfileView";
import { ScannerView } from "@/components/parking/ScannerView";
import { MapView } from "@/components/parking/MapView";
import { OperatorView } from "@/components/parking/OperatorView";
import { NotifBell, NotifSheet, useSessionAlerts } from "@/components/parking/NotifCenter";
import { useParkir } from "@/lib/store";
import { campusById, campusLabel, rupiah, tr } from "@/lib/parking-data";
import { cn } from "@/lib/utils";

type Tab = "home" | "history" | "wallet" | "profile";
type View =
  | { name: "tabs" }
  | { name: "booking"; slotId: string; slotNumber: string; type: "ADVANCE" | "WALK_IN" }
  | { name: "ticket"; reservationId: string };

export default function Page() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <Splash />;

  return <App />;
}

function Splash() {
  return (
    <div className="ambient flex min-h-dvh flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <LogoMark size={64} />
      </motion.div>
      <p className="font-display text-lg font-bold tracking-tight">Parkir Binus</p>
    </div>
  );
}

function App() {
  const signedIn = useParkir((s) => s.signedIn);
  const role = useParkir((s) => s.user.role);
  if (!signedIn) return <Landing />;
  if (role === "OPERATOR") return <OperatorShell />;
  return <Shell />;
}

function Shell() {
  const lang = useParkir((s) => s.lang);
  const setLang = useParkir((s) => s.setLang);
  const walletBalance = useParkir((s) => s.walletBalance);
  const campus = campusById(useParkir((s) => s.campusId));
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const { theme, setTheme } = useTheme();

  const [tab, setTab] = React.useState<Tab>("home");
  const [view, setView] = React.useState<View>({ name: "tabs" });
  const [mapOpen, setMapOpen] = React.useState(false);
  const [scanOpen, setScanOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const toast = useParkir((s) => s.toast);

  // Live "session ending soon" / overtime alerts for the customer's own sessions.
  useSessionAlerts();

  const navTabs: { k: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { k: "home", label: t("navHome"), icon: MapPin },
    { k: "history", label: t("navHistory"), icon: HistoryIcon },
    { k: "wallet", label: t("navWallet"), icon: WalletIcon },
    { k: "profile", label: t("navProfile"), icon: UserRound },
  ];

  function openBooking(slotId: string, slotNumber: string, type: "ADVANCE" | "WALK_IN" = "ADVANCE") {
    setView({ name: "booking", slotId, slotNumber, type });
  }

  return (
    <div className="ambient flex min-h-dvh flex-col">
      {/* ── header ── */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[430px] items-center gap-2 px-4">
          <LogoMark size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[13.5px] font-bold leading-tight tracking-tight">
              {t("appName")}
            </p>
            <p className="truncate text-[9px] text-muted-foreground">{campusLabel(campus)}</p>
          </div>
          <NotifBell onOpen={() => setNotifOpen(true)} />
          <button
            onClick={() => {
              setView({ name: "tabs" });
              setTab("wallet");
            }}
            aria-label={t("walletTitle")}
            className="flex h-8 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 text-[11px] font-bold text-primary transition hover:bg-primary/20"
          >
            <WalletIcon className="h-3 w-3" />
            <span className="tnum">{rupiah(walletBalance)}</span>
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={t("appearance")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setLang(lang === "id" ? "en" : "id")}
            aria-label={t("language")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/50 text-[10px] font-black text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </header>

      {/* ── main ── */}
      <main className="mx-auto w-full max-w-[430px] flex-1 px-4 pb-32 pt-4">
        <AnimatePresence mode="wait">
          {view.name === "tabs" && (
            <motion.div
              key={`tab-${tab}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === "home" && (
                <HomeView
                  onSlotPress={(slotId, slotNumber) => openBooking(slotId, slotNumber)}
                  onOpenMap={() => setMapOpen(true)}
                />
              )}
              {tab === "history" && (
                <HistoryView
                  onOpen={(id) => setView({ name: "ticket", reservationId: id })}
                />
              )}
              {tab === "wallet" && <WalletView />}
              {tab === "profile" && <ProfileView />}
            </motion.div>
          )}

          {view.name === "booking" && (
            <BookingView
              key={`booking-${view.slotId}`}
              slotId={view.slotId}
              slotNumber={view.slotNumber}
              defaultType={view.type}
              onDone={(resId) => setView({ name: "ticket", reservationId: resId })}
              onBack={() => setView({ name: "tabs" })}
            />
          )}

          {view.name === "ticket" && (
            <TicketView
              key={`ticket-${view.reservationId}`}
              reservation={view.reservationId}
              onBack={() => {
                setView({ name: "tabs" });
                setTab("history");
              }}
              onUpdate={() => {}}
            />
          )}
        </AnimatePresence>
      </main>

      {/* ── floating bottom nav (hidden during focused flows) ── */}
      {view.name === "tabs" && (
      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-30 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-[430px] px-4">
          <div className="relative">
            {/* center scan button — elevated above the pill, solid (no ring) */}
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[55%]">
              <button
                onClick={() => setScanOpen(true)}
                aria-label={t("scanQr")}
                className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-primary shadow-[0_16px_32px_-10px_rgba(255,214,10,0.55),0_6px_16px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:scale-105 active:scale-90"
              >
                <QrGlyph className="h-7 w-7 text-primary-foreground" />
              </button>
            </div>

            <div className="glass flex items-stretch justify-around rounded-[1.6rem] px-2.5 py-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)]">
              {navTabs.slice(0, 2).map(({ k, label, icon: Icon }) => (
                <NavBtn
                  key={k}
                  active={tab === k}
                  label={label}
                  onClick={() => {
                    setView({ name: "tabs" });
                    setTab(k);
                  }}
                >
                  <Icon className="h-[1.15rem] w-[1.15rem]" />
                </NavBtn>
              ))}

              {/* spacer under the elevated scan button */}
              <div aria-hidden className="flex w-16 shrink-0 flex-col items-center justify-end pb-1.5">
                <span className="text-[9.5px] font-bold leading-none text-muted-foreground/70">
                  {t("scanQr")}
                </span>
              </div>

              {navTabs.slice(2, 4).map(({ k, label, icon: Icon }) => (
                <NavBtn
                  key={k}
                  active={tab === k}
                  label={label}
                  onClick={() => {
                    setView({ name: "tabs" });
                    setTab(k);
                  }}
                >
                  <Icon className="h-[1.15rem] w-[1.15rem]" />
                </NavBtn>
              ))}
            </div>
          </div>
        </div>
      </nav>
      )}

      {/* ── overlays ── */}
      <MapView
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onSlotPress={(slotId, slotNumber) => openBooking(slotId, slotNumber)}
      />

      <ScannerView
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onResult={(kind, resId) => {
          setScanOpen(false);
          toast(
            kind === "checkout" ? t("checkoutOk") : kind === "walkin" ? t("walkinOk") : t("checkinOk"),
            "success"
          );
          if (resId) setView({ name: "ticket", reservationId: resId });
        }}
      />

      <NotifSheet open={notifOpen} onClose={() => setNotifOpen(false)} />

      <Toasts />
    </div>
  );
}

/** Operator shell — officer console header + dashboard, no customer nav. */
function OperatorShell() {
  const lang = useParkir((s) => s.lang);
  const setLang = useParkir((s) => s.setLang);
  const campusId = useParkir((s) => s.campusId);
  const selectCampus = useParkir((s) => s.selectCampus);
  const campus = campusById(campusId);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const { theme, setTheme } = useTheme();

  return (
    <div className="ambient flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[430px] items-center gap-2.5 px-4 md:max-w-[900px] lg:max-w-[1100px]">
          <LogoMark size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[13.5px] font-bold leading-tight tracking-tight">
              {t("appName")} <span className="hidden text-muted-foreground/60 sm:inline">· Command Center</span>
            </p>
            <button
              onClick={() =>
                selectCampus(
                  campusId === "anggrek" ? "alamsutera" : campusId === "alamsutera" ? "bekasi" : "anggrek"
                )
              }
              aria-label={lang === "id" ? "Ganti kampus" : "Switch campus"}
              title={campusLabel(campus)}
              className="mt-0.5 flex max-w-full items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-binus-bright transition hover:text-primary"
            >
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">
                {t("operatorBadge")} · {campus.building ?? campus.name.replace("BINUS @ ", "")}
              </span>
              <ArrowLeftRight className="h-2.5 w-2.5 shrink-0 opacity-60" />
            </button>
          </div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={t("appearance")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setLang(lang === "id" ? "en" : "id")}
            aria-label={t("language")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/50 text-[10px] font-black text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[430px] flex-1 px-4 pb-10 pt-4 md:max-w-[900px] lg:max-w-[1100px]">
        <OperatorView />
      </main>

      <Toasts />
    </div>
  );
}

function NavBtn({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 transition-colors duration-200",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="relative flex h-7 w-12 items-center justify-center">
        {/* sliding active pill */}
        {active && (
          <motion.span
            layoutId="nav-active-pill"
            transition={{ type: "spring", stiffness: 480, damping: 34 }}
            className="absolute inset-0 rounded-full bg-primary/15"
          />
        )}
        <span className="relative flex items-center justify-center transition-transform duration-200 group-active:scale-90">
          {children}
        </span>
      </span>
      <span
        className={cn(
          "text-[9.5px] font-bold leading-none transition-colors duration-200",
          active ? "text-primary" : "text-muted-foreground/80"
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** QR glyph — 3 finder squares + alignment dots, tuned for small sizes. */
function QrGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="2" y="2" width="7.5" height="7.5" rx="1.8" stroke="currentColor" strokeWidth="1.9" />
      <rect x="14.5" y="2" width="7.5" height="7.5" rx="1.8" stroke="currentColor" strokeWidth="1.9" />
      <rect x="2" y="14.5" width="7.5" height="7.5" rx="1.8" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" />
      <circle cx="17.4" cy="13.4" r="1.15" fill="currentColor" />
      <circle cx="20.6" cy="16.4" r="1.15" fill="currentColor" />
      <circle cx="13.6" cy="17.4" r="1.15" fill="currentColor" />
      <circle cx="17.4" cy="20.4" r="1.15" fill="currentColor" />
      <circle cx="20.6" cy="20.4" r="1.15" fill="currentColor" />
    </svg>
  );
}

function Toasts() {
  const toasts = useParkir((s) => s.toasts);
  const dismiss = useParkir((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((tst) => (
          <motion.button
            key={tst.id}
            layout
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => dismiss(tst.id)}
            className={cn(
              "glass pointer-events-auto flex max-w-[380px] items-center gap-2.5 rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-xl",
              tst.tone === "success" && "border-emerald-400/30",
              tst.tone === "error" && "border-red-400/30"
            )}
          >
            {tst.tone === "success" && <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" />}
            {tst.tone === "error" && <XCircle className="h-4.5 w-4.5 shrink-0 text-red-400" />}
            {tst.tone === "info" && <Info className="h-4.5 w-4.5 shrink-0 text-primary" />}
            <span className="text-left leading-snug">{tst.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
