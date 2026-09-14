"use client";
/**
 * Parkir Binus — BINUS Self-Parking Platform (upgrade dari prototype Expo per PRD v1.0)
 * Single-page app: customer flow + admin operator panel.
 * Simulated: Google Sign-In (demo), QRIS payment, gate barrier & sensors.
 */
import React, { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { AuthGate } from "@/components/parking/AuthGate";
import { HomeView } from "@/components/parking/HomeView";
import { BookingView } from "@/components/parking/BookingView";
import { TicketView, type TicketReservation } from "@/components/parking/TicketView";
import { ScannerView, type ScanResponse } from "@/components/parking/ScannerView";
import { HistoryView, type HistoryItem } from "@/components/parking/HistoryView";
import { WalletView } from "@/components/parking/WalletView";
import { ProfileView } from "@/components/parking/ProfileView";
import { AdminApp } from "@/components/parking/admin/AdminApp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rupiah } from "@/lib/parking";
import { MapPin, History as HistoryIcon, Wallet as WalletIcon, UserRound, Languages, ShieldCheck, CarFront, ScanLine, Sparkles, QrCode } from "lucide-react";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 5000, retry: 1 } } });

type Tab = "home" | "history" | "wallet" | "profile";
type View = { name: "tabs" } | { name: "booking"; slotId: string; slotNumber: string; type: "ADVANCE" | "WALK_IN" } | { name: "ticket"; reservationId: string };

interface MeData {
  user: null | {
    id: string; name: string; email: string; isBinusian: boolean; role: string; walletBalance: number; phone: string | null;
  };
  vehicles: { id: string; nickname: string; licensePlate: string; brand: string | null; model: string | null; color: string | null }[];
}

export default function Page() {
  return (
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <Root />
        <Toaster position="top-center" richColors />
      </I18nProvider>
    </QueryClientProvider>
  );
}

function Root() {
  const { t, lang, setLang } = useI18n();
  const queryClient = useQueryClient();
  const [authOpen, setAuthOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [view, setView] = useState<View>({ name: "tabs" });
  const [ticket, setTicket] = useState<TicketReservation | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const { data: me, isLoading: meLoading, refetch: refetchMe } = useQuery<MeData>({
    queryKey: ["me"],
    queryFn: async () => (await fetch("/api/auth/me")).json(),
  });

  const user = me?.user;
  const vehicles = me?.vehicles ?? [];

  const refreshAll = useCallback(() => {
    refetchMe();
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["locations"] });
    queryClient.invalidateQueries({ queryKey: ["adminStats"] });
  }, [refetchMe, queryClient]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.clear();
    refetchMe();
    setAdminMode(false);
    setView({ name: "tabs" });
    setTab("home");
  }

  async function openTicket(reservationId: string) {
    const res = await fetch(`/api/reservations/${reservationId}`);
    if (res.ok) {
      const data = await res.json();
      setTicket(data.reservation);
      setView({ name: "ticket", reservationId });
    }
  }

  // ===== landing (not signed in) =====
  if (!meLoading && !user) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50 via-background to-background">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 py-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/30">
            <CarFront className="h-10 w-10 text-white" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">{t("appName")}</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">{t("tagline")}</p>

          <div className="mt-8 w-full space-y-2.5">
            {[
              { icon: MapPin, title: "Slot persis di site-plan asli", desc: "Pilih nomor slot favoritmu di Gedung Parkir Anggrek" },
              { icon: ScanLine, title: "Scan QR slot dari HP", desc: "Check-in & keluar cukup scan QR permanen di tiap slot — seperti charger mobil listrik" },
              { icon: Sparkles, title: "Heatmap permintaan", desc: "Lihat jam & hari paling padat sebelum kamu berangkat" },
              { icon: WalletIcon, title: "Dompet & refund jelas", desc: "Bayar biaya layanan via dompet — refund otomatis sesuai kebijakan" },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-center gap-3 rounded-2xl border bg-white/80 dark:bg-card/80 p-3.5 backdrop-blur">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-[11px] text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto w-full pt-8">
            <Button size="lg" className="w-full rounded-2xl shadow-lg" onClick={() => setAuthOpen(true)}>
              {t("signIn")}
            </Button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {t("signInNote")}
            </p>
            <p className="mt-1 text-center text-[10px] text-muted-foreground">{t("pwa")} · {t("footerNote")}</p>
          </div>
        </main>
        <AuthGate open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  // ===== admin panel =====
  if (user?.role === "ADMIN" && adminMode) {
    return <AdminApp onExit={() => setAdminMode(false)} />;
  }

  // ===== customer app =====
  const navTabs: { k: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { k: "home", label: t("navHome"), icon: MapPin },
    { k: "history", label: t("navHistory"), icon: HistoryIcon },
    { k: "wallet", label: t("navWallet"), icon: WalletIcon },
    { k: "profile", label: t("navProfile"), icon: UserRound },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* header */}
      <header className="sticky top-0 z-30 border-b bg-white/90 dark:bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <CarFront className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{t("appName")}</p>
            <p className="truncate text-[9px] text-muted-foreground">BINUS Anggrek · {t("pwa")}</p>
          </div>
          {user?.role === "ADMIN" && (
            <Button variant="outline" size="sm" className="h-7 rounded-lg text-[10px]" onClick={() => setAdminMode(true)}>
              <ShieldCheck className="mr-1 h-3 w-3" /> {t("adminPanel")}
            </Button>
          )}
          <button
            onClick={() => {
              setView({ name: "tabs" });
              setTab("wallet");
            }}
            className="flex h-7 items-center gap-1 rounded-full border bg-white dark:bg-card px-2.5 text-[11px] font-bold text-primary transition hover:border-primary/50"
            aria-label={t("walletBalance")}
          >
            <WalletIcon className="h-3 w-3" />
            {meLoading ? "…" : rupiah(user?.walletBalance ?? 0)}
          </button>
          <button
            onClick={() => setLang(lang === "id" ? "en" : "id")}
            className="flex h-7 items-center gap-1 rounded-full border bg-white dark:bg-card px-2 text-[10px] font-bold text-muted-foreground transition hover:border-primary/50"
            aria-label={t("language")}
          >
            <Languages className="h-3 w-3" />
            {lang === "id" ? "ID" : "EN"}
          </button>
        </div>
      </header>

      {/* main */}
      <main className="flex-1">
        <div className="mx-auto flex min-h-[calc(100vh-8.5rem)] w-full max-w-md flex-col px-4 py-4">
          <div className="flex-1">
            {view.name === "tabs" && (
              <>
                {tab === "home" && (
                  <HomeView
                    onSlotPress={(s) => setView({ name: "booking", slotId: s.id, slotNumber: s.slotNumber, type: "ADVANCE" })}
                    onOpenScanner={() => setScanOpen(true)}
                  />
                )}
                {tab === "history" && <HistoryView onOpen={(r) => openTicket(r.id)} />}
                {tab === "wallet" && <WalletView />}
                {tab === "profile" && (
                  <ProfileView
                    user={{ name: user?.name ?? "", email: user?.email ?? "", isBinusian: !!user?.isBinusian, walletBalance: user?.walletBalance ?? 0 }}
                    vehicles={vehicles}
                    onRefresh={refetchMe}
                    onSignOut={signOut}
                  />
                )}
              </>
            )}

            {view.name === "booking" && (
              <BookingView
                slot={{ id: view.slotId, slotNumber: view.slotNumber }}
                defaultType={view.type}
                user={{ name: user?.name ?? "", email: user?.email ?? "" }}
                vehicles={vehicles}
                walletBalance={user?.walletBalance ?? 0}
                onDone={(r) => {
                  refreshAll();
                  openTicket(r.id);
                }}
                onBack={() => setView({ name: "tabs" })}
                onRefresh={refetchMe}
              />
            )}

            {view.name === "ticket" && ticket && (
              <TicketView
                reservation={ticket}
                onBack={() => {
                  setView({ name: "tabs" });
                  setTab("history");
                }}
                onUpdate={(r) => {
                  setTicket(r);
                  refreshAll();
                }}
                onOpenScanner={() => setScanOpen(true)}
              />
            )}
          </div>

          {/* footer — sticky to bottom on short pages */}
          <footer className="mt-8 border-t pt-3 text-center text-[10px] text-muted-foreground">
            <p>
              {t("appName")} · {t("pwa")}
            </p>
          </footer>
        </div>
      </main>

      {/* bottom nav (docked) with centered scan button */}
      <nav className="sticky bottom-0 z-30 border-t bg-white/95 dark:bg-card/95 backdrop-blur" aria-label="Main navigation">
        <div className="mx-auto flex max-w-md items-end justify-around px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5 relative">
          {/* Left side tabs */}
          {navTabs.slice(0, 2).map(({ k, label, icon: Icon }) => {
            const active = view.name === "tabs" && tab === k;
            return (
              <button
                key={k}
                onClick={() => {
                  setView({ name: "tabs" });
                  setTab(k);
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-semibold transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "fill-primary/15")} />
                {label}
                {active && <span className="h-1 w-6 rounded-full bg-primary" />}
              </button>
            );
          })}

          {/* Center scan button - elevated */}
          <div className="flex flex-1 items-center justify-center">
            <button
              onClick={() => setScanOpen(true)}
              className="flex h-14 w-14 -mt-6 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95"
              aria-label={t("scanSlotCta")}
            >
              <QrCode className="h-7 w-7 text-white" />
            </button>
          </div>

          {/* Right side tabs */}
          {navTabs.slice(2, 4).map(({ k, label, icon: Icon }) => {
            const active = view.name === "tabs" && tab === k;
            return (
              <button
                key={k}
                onClick={() => {
                  setView({ name: "tabs" });
                  setTab(k);
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-semibold transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "fill-primary/15")} />
                {label}
                {active && <span className="h-1 w-6 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* scanner QR slot — model HP-scan-slot (seperti charger listrik) */}
      <ScannerView
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onResult={(resp: ScanResponse) => {
          refreshAll();
          if (resp.reservation) {
            // CHECKIN/WALKIN → buka tiket sesi; CHECKOUT → tampilkan tiket selesai
            openTicket(resp.reservation.id);
          }
        }}
      />
    </div>
  );
}
