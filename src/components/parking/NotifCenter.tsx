"use client";
/**
 * Notification center — bell button + slide-in inbox sheet.
 *
 * Notifications are structured (kind + params) and rendered per-language at
 * display time, so the EN/ID toggle stays correct for every stored item.
 * A 30-second detector also raises "session ending soon" / "overtime" alerts
 * for the signed-in user's own CHECKED_IN sessions (deduped by key).
 */
import * as React from "react";
import {
  Bell,
  CarFront,
  CircleAlert,
  Clock,
  Gift,
  Info,
  ReceiptText,
  Timer,
} from "lucide-react";
import { tr, type Lang, type Notif, type NotifKind } from "@/lib/parking-data";
import { useParkir } from "@/lib/store";
import { cn } from "@/lib/utils";

// ───────────────────────────── rendering ─────────────────────────────

function tpl(lang: Lang, key: string, params: Record<string, string | number>): string {
  let s = tr(lang, key as Parameters<typeof tr>[1]);
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function notifText(lang: Lang, n: Notif): { title: string; body: string } {
  return {
    title: tpl(lang, `notifK${cap(n.kind)}Title`, n.params),
    body: tpl(lang, `notifK${cap(n.kind)}Body`, n.params),
  };
}

function cap(k: NotifKind): string {
  const map: Record<NotifKind, string> = {
    welcome: "Welcome",
    booking: "Booking",
    session_start: "SessionStart",
    session_end_soon: "SessionEndSoon",
    overtime: "Overtime",
    extended: "Extended",
    receipt: "Receipt",
    refund: "Refund",
    promo: "Promo",
  };
  return map[k];
}

export function timeAgo(lang: Lang, createdAt: number): string {
  const s = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (s < 60) return tr(lang, "notifJustNow");
  const m = Math.floor(s / 60);
  if (m < 60) return tpl(lang, "notifMinAgo", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return tpl(lang, "notifHourAgo", { h });
  return tpl(lang, "notifDayAgo", { d: Math.floor(h / 24) });
}

const KIND_ICON: Record<NotifKind, React.ComponentType<{ className?: string }>> = {
  welcome: Bell,
  booking: CircleAlert,
  session_start: CarFront,
  session_end_soon: Clock,
  overtime: Timer,
  extended: Clock,
  receipt: ReceiptText,
  refund: ReceiptText,
  promo: Gift,
};

const KIND_TONE: Record<NotifKind, string> = {
  welcome: "bg-primary/15 text-primary",
  booking: "bg-primary/15 text-primary",
  session_start: "bg-emerald-400/15 text-emerald-400",
  session_end_soon: "bg-amber-400/15 text-amber-400",
  overtime: "bg-red-400/15 text-red-400",
  extended: "bg-sky-400/15 text-sky-400",
  receipt: "bg-emerald-400/15 text-emerald-400",
  refund: "bg-red-400/15 text-red-400",
  promo: "bg-amber-400/15 text-amber-400",
};

// ───────────────────────────── live alerts ─────────────────────────────

/** Raises session-ending/overtime notifications for the user's own active sessions.
 *  Also fires native OS push via Service Worker when pushEnabled is true.
 */
export function useSessionAlerts() {
  const reservations = useParkir((s) => s.reservations);
  const user = useParkir((s) => s.user);
  const pushNotif = useParkir((s) => s.pushNotif);

  /** Send a push via the registered SW (no-op if SW not available/not registered). */
  function sendPush(title: string, body: string, tag: string) {
    if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: "NOTIFY", title, body, tag });
  }

  React.useEffect(() => {
    const check = () => {
      const now = Date.now();
      const { lang, pushEnabled } = useParkir.getState();
      for (const r of useParkir.getState().reservations) {
        if (r.status !== "CHECKED_IN" || r.driverName !== user.name) continue;
        const plannedEnd = new Date(`${r.date}T${r.endTime}:00`).getTime();
        const minsLeft = Math.round((plannedEnd - now) / 60_000);
        if (minsLeft <= 0) {
          useParkir.getState().pushNotif({
            key: `ot:${r.id}`,
            kind: "overtime",
            params: { slot: r.slotNumber },
          });
          if (pushEnabled) {
            const title = "Parkir Binus";
            const body = lang === "id"
              ? `Sesi parkir ${r.slotNumber} sudah melewati jadwal. Segera keluar.`
              : `Parking session ${r.slotNumber} is overdue. Please exit now.`;
            sendPush(title, body, `ot-${r.id}`);
          }
        } else if (minsLeft <= 15) {
          // OS push for ≤15 min (more urgent threshold for background alerts)
          const firstCross = !useParkir.getState().notifications.some((n) => n.key === `end:${r.id}`);
          useParkir.getState().pushNotif({
            key: `end:${r.id}`,
            kind: "session_end_soon",
            params: { slot: r.slotNumber, minutes: minsLeft },
          });
          if (firstCross) {
            const msg = tpl(useParkir.getState().lang, "endSoonToast", {
              slot: r.slotNumber,
              minutes: minsLeft,
            });
            useParkir.getState().toast(msg, "error");
          }
          if (pushEnabled) {
            const title = "Parkir Binus";
            const body = lang === "id"
              ? `Sesi parkir ${r.slotNumber} berakhir dalam ${minsLeft} menit. Perpanjang atau segera keluar.`
              : `Parking session ${r.slotNumber} ends in ${minsLeft} minutes. Extend or exit soon.`;
            sendPush(title, body, `end-${r.id}`);
          }
        } else if (minsLeft <= 30) {
          const firstCross = !useParkir.getState().notifications.some((n) => n.key === `end:${r.id}`);
          useParkir.getState().pushNotif({
            key: `end:${r.id}`,
            kind: "session_end_soon",
            params: { slot: r.slotNumber, minutes: minsLeft },
          });
          if (firstCross) {
            const msg = tpl(useParkir.getState().lang, "endSoonToast", {
              slot: r.slotNumber,
              minutes: minsLeft,
            });
            useParkir.getState().toast(msg, "error");
          }
        }
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [reservations, user.name, pushNotif]);
}

// ───────────────────────────── bell + sheet ─────────────────────────────

export function NotifBell({ onOpen }: { onOpen: () => void }) {
  const lang = useParkir((s) => s.lang);
  const unread = useParkir((s) => s.notifications.filter((n) => !n.read).length);
  return (
    <button
      onClick={onOpen}
      aria-label={tr(lang, "notifUnreadAria")}
      className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
    >
      <Bell className="h-3.5 w-3.5" />
      {unread > 0 && (
        <span className="tnum absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8.5px] font-black text-white shadow-sm">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

export function NotifSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useParkir((s) => s.lang);
  const notifications = useParkir((s) => s.notifications);
  const markNotifsRead = useParkir((s) => s.markNotifsRead);
  const clearNotifs = useParkir((s) => s.clearNotifs);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  // NOTE: the sheet stays MOUNTED and slides via CSS transform — unmounting an
  // animating tree (AnimatePresence exit) trips React 19's removeChild in dev.
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        role="dialog"
        aria-label={t("notifTitle")}
        aria-hidden={!open}
        className={cn(
          "fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[380px] flex-col border-l border-border/60 bg-background/95 backdrop-blur-xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        )}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3.5">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-tight">
            <Bell className="h-4 w-4 text-primary" />
            {t("notifTitle")}
            {notifications.length > 0 && (
              <span className="tnum rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-black text-primary">
                {notifications.length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1.5">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={markNotifsRead}
                  className="rounded-full border border-border px-2.5 py-1 text-[9.5px] font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {t("notifMarkAll")}
                </button>
                <button
                  onClick={clearNotifs}
                  className="rounded-full border border-red-400/25 bg-red-400/[0.06] px-2.5 py-1 text-[9.5px] font-bold text-red-400 transition hover:bg-red-400/10"
                >
                  {t("notifClearAll")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* list */}
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </span>
              <p className="text-sm font-bold">{t("notifEmpty")}</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{t("notifEmptySub")}</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = KIND_ICON[n.kind];
              const { title, body } = notifText(lang, n);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-2.5 rounded-2xl border px-3 py-2.5",
                    n.read ? "border-border/50 bg-card/30" : "border-primary/25 bg-primary/[0.06]"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      KIND_TONE[n.kind]
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[12px] font-bold leading-tight">{title}</p>
                      <span className="shrink-0 text-[9px] text-muted-foreground">
                        {timeAgo(lang, n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{body}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
