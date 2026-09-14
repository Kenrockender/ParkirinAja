"use client";
/**
 * Parkir Binus — Dark Premium UI Concept v4
 * Live preview app: full customer journey on simulated data.
 */
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  CheckCircle2,
  History as HistoryIcon,
  Info,
  MapPin,
  Moon,
  QrCode,
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
import { useParkir } from "@/lib/store";
import { rupiah, tr } from "@/lib/parking-data";
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
  if (!signedIn) return <Landing />;
  return <Shell />;
}

function Shell() {
  const lang = useParkir((s) => s.lang);
  const setLang = useParkir((s) => s.setLang);
  const walletBalance = useParkir((s) => s.walletBalance);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const { theme, setTheme } = useTheme();

  const [tab, setTab] = React.useState<Tab>("home");
  const [view, setView] = React.useState<View>({ name: "tabs" });
  const [mapOpen, setMapOpen] = React.useState(false);
  const [scanOpen, setScanOpen] = React.useState(false);

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
        <div className="mx-auto flex h-14 w-full max-w-[430px] items-center gap-2.5 px-4">
          <LogoMark size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[13.5px] font-bold leading-tight tracking-tight">
              {t("appName")}
            </p>
            <p className="truncate text-[9px] text-muted-foreground">
              BINUS @ Kemanggisan · Anggrek
            </p>
          </div>
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
                  onOpenScanner={() => setScanOpen(true)}
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
              onOpenScanner={() => setScanOpen(true)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* ── floating bottom nav (hidden during focused flows) ── */}
      {view.name === "tabs" && (
      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-30 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-[430px] px-4">
          <div className="glass glow-soft relative flex items-end justify-around rounded-[1.75rem] px-2 pb-1.5 pt-1.5">
            {navTabs.slice(0, 2).map(({ k, label, icon: Icon }) => (
              <NavBtn
                key={k}
                active={view.name === "tabs" && tab === k}
                label={label}
                onClick={() => {
                  setView({ name: "tabs" });
                  setTab(k);
                }}
              >
                <Icon className="h-5 w-5" />
              </NavBtn>
            ))}

            {/* center scan FAB */}
            <div className="relative flex w-16 justify-center">
              <button
                onClick={() => setScanOpen(true)}
                aria-label={t("scanQr")}
                className="glow-primary -mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary transition-transform hover:scale-105 active:scale-90"
              >
                <span className="absolute inset-0 rounded-full bg-primary/40 blur-lg" aria-hidden />
                <QrCode className="relative h-6 w-6 text-primary-foreground" />
              </button>
            </div>

            {navTabs.slice(2, 4).map(({ k, label, icon: Icon }) => (
              <NavBtn
                key={k}
                active={view.name === "tabs" && tab === k}
                label={label}
                onClick={() => {
                  setView({ name: "tabs" });
                  setTab(k);
                }}
              >
                <Icon className="h-5 w-5" />
              </NavBtn>
            ))}
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
        onResult={(_kind, resId) => {
          setScanOpen(false);
          if (resId) setView({ name: "ticket", reservationId: resId });
        }}
      />

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
        "group flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
          active && "bg-primary/15"
        )}
      >
        {children}
      </span>
      <span className="text-[9.5px] font-bold leading-none">{label}</span>
    </button>
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
