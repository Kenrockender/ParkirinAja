"use client";
/** HistoryView — reservation history with cancel/refund flow (PRD §19, §25). */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { rupiah } from "@/lib/parking";
import { History as HistoryIcon, MapPin, ChevronRight, XCircle, Info } from "lucide-react";
import { toast } from "sonner";

export interface HistoryItem {
  id: string;
  code: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceFee: number;
  parkingFee: number;
  overtimeFee: number;
  refundAmount: number;
  totalAmount: number;
  vehiclePlate: string;
  driverName: string;
  slot: { slotNumber: string };
  location: { name: string };
}

const ST_CLS: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  CHECKED_IN: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-zinc-100 text-zinc-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-amber-100 text-amber-800",
  EXPIRED: "bg-zinc-100 text-zinc-500",
};

export function HistoryView({ onOpen }: { onOpen: (r: HistoryItem) => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<HistoryItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0); // force re-render for countdown

  const { data, isLoading } = useQuery<{ reservations: HistoryItem[] }>({
    queryKey: ["reservations"],
    queryFn: async () => (await fetch("/api/reservations")).json(),
    refetchInterval: 20000,
  });

  // Update countdown every second
  React.useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const list = data?.reservations ?? [];

  // refund estimate for cancel target
  function refundEstimate(r: HistoryItem): number {
    const now = Date.now();
    const created = new Date(r.createdAt).getTime();
    const minutesSinceCreation = (now - created) / 60000;
    
    // 100% refund if within 10 minutes of creation
    if (minutesSinceCreation <= 10) return r.serviceFee;
    
    // 50% refund if more than 24h before start
    const start = new Date(`${r.date}T${r.startTime}:00+07:00`);
    const hoursBefore = (start.getTime() - now) / 3600000;
    if (hoursBefore > 24) return Math.floor(r.serviceFee * 0.5);
    
    // Otherwise 50% refund
    return Math.floor(r.serviceFee * 0.5);
  }
  
  // countdown for 10-minute full refund window
  function getFullRefundCountdown(createdAt: string): { isEligible: boolean; minutesLeft: number; secondsLeft: number } {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    const elapsed = now - created;
    const remaining = (10 * 60 * 1000) - elapsed; // 10 minutes in ms
    
    if (remaining <= 0) {
      return { isEligible: false, minutesLeft: 0, secondsLeft: 0 };
    }
    
    const minutesLeft = Math.floor(remaining / 60000);
    const secondsLeft = Math.floor((remaining % 60000) / 1000);
    
    return { isEligible: true, minutesLeft, secondsLeft };
  }

  async function doCancel() {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/reservations/${cancelTarget.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(t("error"));
        return;
      }
      toast.success(`${t("stCancelled")} · ${t("youGetRefund")} ${rupiah(data.refund)}`);
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
      setCancelTarget(null);
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="flex items-center gap-2 text-lg font-bold">
        <HistoryIcon className="h-5 w-5 text-primary" /> {t("historyTitle")}
      </h1>

      <Card className="rounded-2xl bg-accent/40">
        <CardContent className="p-3 text-[11px] text-accent-foreground">
          <p className="mb-1 flex items-center gap-1 font-semibold">
            <Info className="h-3.5 w-3.5" /> {t("refundInfo")}
          </p>
          <p>• {t("refund100")}</p>
          <p>• {t("refund50")}</p>
          <p>• {t("refund0")}</p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : list.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("noReservations")}</p>
          </CardContent>
        </Card>
      ) : (
        list.map((r) => {
          const countdown = getFullRefundCountdown(r.createdAt);
          return (
            <div key={r.id} className="rounded-xl border bg-card p-3 shadow-sm transition hover:shadow-md">
              {/* Full refund countdown banner */}
              {r.status === "CONFIRMED" && countdown.isEligible && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1.5">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-emerald-900 dark:text-emerald-100">
                      💯 Refund 100% berakhir dalam:
                    </p>
                    <p className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {String(countdown.minutesLeft).padStart(2, '0')}:{String(countdown.secondsLeft).padStart(2, '0')}
                    </p>
                  </div>
                </div>
              )}
              
              <div role="button" tabIndex={0} onClick={() => onOpen(r)} onKeyDown={(e) => e.key === "Enter" && onOpen(r)} className="flex cursor-pointer items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-[10px] font-bold">
                  <span className="text-muted-foreground">{r.type === "ADVANCE" ? "ADV" : "WALK"}</span>
                  <span className="text-primary">{r.slot.slotNumber}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{r.date} · {r.startTime}–{r.endTime}</p>
                    <Badge variant="secondary" className={ST_CLS[r.status] || "bg-zinc-100"}>
                      {t(
                        r.status === "CONFIRMED" ? "stConfirmed" :
                        r.status === "CHECKED_IN" ? "stCheckedIn" :
                        r.status === "COMPLETED" ? "stCompleted" :
                        r.status === "CANCELLED" ? "stCancelled" :
                        r.status === "NO_SHOW" ? "stNoShow" : "stExpired"
                      )}
                    </Badge>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {r.code} · {r.vehiclePlate} · {r.driverName}
                  </p>
                  <p className="text-[11px] font-medium">
                    {t("total")}: {rupiah(r.totalAmount)}
                    {r.refundAmount > 0 && <span className="text-emerald-600"> · {t("txRefund")} -{rupiah(r.refundAmount)}</span>}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              {r.status === "CONFIRMED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-xs text-destructive hover:bg-red-50 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCancelTarget(r);
                  }}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" /> {t("cancelBooking")}
                </Button>
              )}
            </div>
          );
        })
      )}

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (
                <>
                  {cancelTarget.code} · Slot {cancelTarget.slot.slotNumber} · {cancelTarget.date} {cancelTarget.startTime}–{cancelTarget.endTime}
                  <br />
                  <b className="text-emerald-700">{t("youGetRefund")}: {rupiah(refundEstimate(cancelTarget))}</b>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doCancel} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">
              {busy ? t("loading") : t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
