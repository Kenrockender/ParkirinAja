"use client";
/** HomeView — crowd info, availability window selector, actual map, promo ads, heatmap. */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { ParkingMap, LegendRow, type SlotVM } from "./ParkingMap";
import { HeatmapCard } from "./HeatmapCard";
import { rupiah as qrupiah } from "@/lib/parking";
import { CalendarClock, Coffee, CarFront, PartyPopper, Gauge, QrCode, CalendarIcon, Clock, Map } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface LocData {
  location: {
    id: string; name: string; campus: string; address: string; operatingHours: string;
    advanceFee: number; walkInFee: number;
  };
  window: { date: string; startTime: string; endTime: string };
  slots: SlotVM[];
  counts: Record<string, number>;
}

const THEME_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  coffee: Coffee,
  carwash: CarFront,
  event: PartyPopper,
};

export function HomeView({ onSlotPress, onOpenScanner }: { onSlotPress: (slot: SlotVM) => void; onOpenScanner: () => void }) {
  const { t } = useI18n();
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Carousel slide tracking
  React.useEffect(() => {
    if (!carouselApi) return;
    
    setCurrentSlide(carouselApi.selectedScrollSnap());
    
    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // default window = today, next 2h — filled after first fetch
  const { data, isLoading } = useQuery<LocData>({
    queryKey: ["locations", date, start, end],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (date && start && end) {
        p.set("date", date);
        p.set("start", start);
        p.set("end", end);
      }
      const res = await fetch(`/api/locations?${p.toString()}`);
      return res.json();
    },
    refetchInterval: 15000,
  });

  React.useEffect(() => {
    if (data && !date && !start && !end) {
      setDate(data.window.date);
      setStart(data.window.startTime);
      setEnd(data.window.endTime);
    }
  }, [data, date, start, end]);

  const { data: adsData } = useQuery<{ ads: { id: string; title: string; description: string | null; imageTheme: string; imageUrl: string | null; ctaText: string; destinationUrl: string | null }[] }>({
    queryKey: ["ads"],
    queryFn: async () => (await fetch("/api/ads")).json(),
    refetchInterval: 60000,
  });
  const ads = adsData?.ads ?? [];

  const counts = data?.counts;
  const total = data?.slots.length || 0;
  const free = counts?.AVAILABLE ?? 0;
  const occupied = (counts?.OCCUPIED ?? 0) + (counts?.RESERVED ?? 0);
  const pct = total ? Math.round((occupied / total) * 100) : 0;
  const level = pct > 66 ? t("high") : pct > 33 ? t("medium") : t("low");
  const levelCls = pct > 66 ? "text-red-600" : pct > 33 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="space-y-4">
      {/* Promo banner carousel (ads) */}
      {ads.length > 0 && (
        <div className="space-y-2">
          <Carousel className="w-full" setApi={setCarouselApi}>
            <CarouselContent>
              {ads.map((ad) => {
                const AdIcon = THEME_ICON[ad.imageTheme] || Coffee;
                const isCustomImage = ad.imageTheme === "image" && ad.imageUrl;
                return (
                  <CarouselItem key={ad.id}>
                    <a
                      href={ad.destinationUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800 p-3.5 transition hover:shadow-md"
                    >
                      {isCustomImage ? (
                        <img 
                          src={ad.imageUrl!} 
                          alt={ad.title}
                          className="h-11 w-11 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900">
                          <AdIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-amber-950 dark:text-amber-100">{ad.title}</span>
                        <span className="block truncate text-xs text-amber-800/80 dark:text-amber-300/80">{ad.description}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-amber-500 dark:bg-amber-600 px-3 py-1 text-[11px] font-bold text-white">{ad.ctaText}</span>
                      <span className="sr-only">(ad)</span>
                    </a>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {ads.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
          {/* Dot indicators */}
          {ads.length > 1 && (
            <div className="flex justify-center gap-1.5">
              {ads.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => carouselApi?.scrollTo(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    idx === currentSlide
                      ? "w-4 bg-amber-600 dark:bg-amber-400"
                      : "w-1.5 bg-amber-300 dark:bg-amber-700"
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Crowd info */}
      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{data?.location.name ?? "BINUS Anggrek"}</p>
              <p className="text-[11px] text-muted-foreground">
                {data?.location.operatingHours ?? "06:00 – 22:00"} · {data?.location.campus}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-primary">
                {isLoading ? "…" : free}
                <span className="text-sm font-medium text-muted-foreground">/{total}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{t("slotsFree")}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium">
              <span className="text-muted-foreground">{t("level")}</span>
              <span className={levelCls}>
                {level} · {pct}%
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3 w-3" /> Advance {qrupiah(data?.location.advanceFee ?? 20000)}
            </span>
            <span className="inline-flex items-center gap-1">
              <QrCode className="h-3 w-3" /> Walk-in {qrupiah(data?.location.walkInFee ?? 30000)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Availability window selector */}
      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <CalendarClock className="h-4 w-4 text-primary" />
            {t("viewForTime")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground">{t("date")}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal text-xs bg-white dark:bg-background",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {date ? format(new Date(date), "dd/MM", { locale: idLocale }) : "Pilih"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(date) : undefined}
                    onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
                    initialFocus
                    locale={idLocale}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground">{t("startTime")}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal text-xs bg-white dark:bg-background",
                      !start && "text-muted-foreground"
                    )}
                  >
                    <Clock className="mr-2 h-3 w-3" />
                    {start || "Pilih"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <TimeSelector value={start} onChange={setStart} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground">{t("endTime")}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal text-xs bg-white dark:bg-background",
                      !end && "text-muted-foreground"
                    )}
                  >
                    <Clock className="mr-2 h-3 w-3" />
                    {end || "Pilih"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <TimeSelector value={end} onChange={setEnd} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Full Map Button */}
      <Button
        className="w-full rounded-xl"
        variant="outline"
        size="lg"
        onClick={() => window.location.href = "/map"}
      >
        <Map className="mr-2 h-4 w-4" />
        {t("viewFullMap") || "Lihat Peta Lengkap"}
      </Button>

      <HeatmapCard />
    </div>
  );
}


// Time selector component
function TimeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6-22
  const minutes = [0, 30];
  
  const [h, m] = value ? value.split(":").map(Number) : [6, 0];
  
  return (
    <div className="flex gap-2">
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground text-center">Jam</p>
        <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
          {hours.map((hour) => (
            <Button
              key={hour}
              variant={h === hour ? "default" : "outline"}
              size="sm"
              className="h-8 w-10 text-xs"
              onClick={() => onChange(`${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`)}
            >
              {String(hour).padStart(2, "0")}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground text-center">Menit</p>
        <div className="flex flex-col gap-1">
          {minutes.map((minute) => (
            <Button
              key={minute}
              variant={m === minute ? "default" : "outline"}
              size="sm"
              className="h-8 w-10 text-xs"
              onClick={() => onChange(`${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)}
            >
              {String(minute).padStart(2, "0")}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
