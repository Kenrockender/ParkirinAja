"use client";
/**
 * Full-screen landscape map page — dedicated view for the parking map
 * Optimized for landscape viewing with rotate prompt for portrait mode
 */
import React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/i18n";
import { ParkingMap, LegendRow, type SlotVM } from "@/components/parking/ParkingMap";
import { ArrowLeft, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 5000, retry: 1 } } });

interface LocData {
  location: {
    id: string; name: string; campus: string; address: string; operatingHours: string;
    advanceFee: number; walkInFee: number;
  };
  window: { date: string; startTime: string; endTime: string };
  slots: SlotVM[];
  counts: Record<string, number>;
}

export default function MapPage() {
  return (
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MapPageContent />
      </I18nProvider>
    </QueryClientProvider>
  );
}

function MapPageContent() {
  const { t } = useI18n();
  const router = useRouter();

  const { data, isLoading } = useQuery<LocData>({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const counts = data?.counts;
  const total = data?.slots.length || 0;
  const free = counts?.AVAILABLE ?? 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white/95 dark:bg-card/95 backdrop-blur px-4 py-3 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-9 w-9 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">{t("back") || "Back"}</span>
          </Button>
          <div>
            <h1 className="text-base font-bold leading-tight">{t("parkingMap") || "Parking Map"}</h1>
            <p className="text-[10px] text-muted-foreground">
              {data?.location.name ?? "BINUS Anggrek"} · Geser untuk lihat semua slot
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Availability stats */}
          <div className="flex items-center gap-1.5 rounded-full border bg-white dark:bg-card px-2.5 py-1">
            <span className="text-[10px] text-muted-foreground">{t("available") || "Available"}:</span>
            <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {isLoading ? "…" : free}
            </span>
            <span className="text-[10px] text-muted-foreground">/ {total}</span>
          </div>
        </div>
      </header>

      {/* Main content - horizontally scrollable map area */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 space-y-3">
          {/* Scroll hint */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-3 py-1.5">
              <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
                💡 Geser ke kanan-kiri untuk melihat semua slot parkir
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center">
            <Card className="inline-flex rounded-xl border bg-white/90 dark:bg-card/90 backdrop-blur px-3 py-2">
              <LegendRow />
            </Card>
          </div>

          {/* Map - with horizontal scroll - FIXED WIDTH */}
          {isLoading ? (
            <div className="flex justify-center">
              <Skeleton className="h-[500px] w-full rounded-2xl" />
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-hidden pb-6 -mx-4 px-4">
              <div style={{ width: '1400px' }}>
                <ParkingMap 
                  slots={data?.slots ?? []} 
                  onSlotPress={(s) => {
                    // Navigate to booking or show details
                    router.push(`/?booking=${s.id}`);
                  }}
                />
              </div>
            </div>
          )}

          {/* Info cards - stacked on mobile, grid on desktop */}
          <div className="grid grid-cols-3 gap-2 max-w-4xl mx-auto">
            <Card className="rounded-xl border bg-white/80 dark:bg-card/80 backdrop-blur p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {t("available") || "Available"}
              </div>
              <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {counts?.AVAILABLE ?? 0}
              </p>
            </Card>

            <Card className="rounded-xl border bg-white/80 dark:bg-card/80 backdrop-blur p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {t("reserved") || "Reserved"}
              </div>
              <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {counts?.RESERVED ?? 0}
              </p>
            </Card>

            <Card className="rounded-xl border bg-white/80 dark:bg-card/80 backdrop-blur p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-1">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                {t("occupied") || "Occupied"}
              </div>
              <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">
                {counts?.OCCUPIED ?? 0}
              </p>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/90 dark:bg-card/90 backdrop-blur px-4 py-2 text-center text-[10px] text-muted-foreground shrink-0">
        {t("mapNote") || "Real-time parking availability"}
      </footer>
    </div>
  );
}
