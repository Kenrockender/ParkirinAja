"use client";
/** Shared window picker bits - full-month calendar + half-hour time grid in popovers. */
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useParkir } from "@/lib/store";
import {
  DAY_LABELS,
  TARIFF,
  dateStr,
  fromMinutes,
  toMinutes,
  type Lang,
} from "@/lib/parking-data";
import { cn } from "@/lib/utils";

export function fmtDateLabel(date: string, lang: string): string {
  const today = dateStr(new Date());
  const tomorrow = dateStr(new Date(Date.now() + 86400_000));
  if (date === today) return lang === "id" ? "Hari ini" : "Today";
  if (date === tomorrow) return lang === "id" ? "Besok" : "Tomorrow";
  return new Date(`${date}T00:00:00`).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

export function WindowPicker({
  label,
  display,
  icon,
  disabled = false,
  onDisabledClick,
  children,
}: {
  label: string;
  display: string;
  icon: React.ReactNode;
  /** Locked picker: shows its value but cannot be opened. */
  disabled?: boolean;
  /** Called when a locked picker is tapped (e.g. to explain why). */
  onDisabledClick?: () => void;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  if (disabled) {
    return (
      <button
        type="button"
        aria-disabled
        onClick={onDisabledClick}
        className="flex w-full cursor-not-allowed flex-col gap-1 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-left opacity-70"
      >
        <span className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>{icon}</span>
          {label}
        </span>
        <span className="tnum text-[13px] font-bold">{display}</span>
      </button>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="group flex w-full flex-col gap-1 rounded-xl border border-border bg-card/60 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent/40">
          <span className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="text-primary">{icon}</span>
            {label}
          </span>
          <span className="tnum text-[13px] font-bold">{display}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 rounded-2xl border-border bg-popover/95 p-3 backdrop-blur-xl"
        align="center"
      >
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}

/** How far ahead bookings can be made - "sebulan" (a month) from today. */
const BOOKING_RANGE_DAYS = 30;

const MONTH_LABELS: Record<Lang, string[]> = {
  id: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday-first weekday index (0=Mon..6=Sun), matching DAY_LABELS' order. */
function mondayIndex(d: Date): number {
  return d.getDay() === 0 ? 6 : d.getDay() - 1;
}

/**
 * Full month calendar - picks any date within a rolling "sebulan" (30-day)
 * booking window. Past days and days beyond the window are shown but greyed
 * out/disabled instead of disappearing, so the calendar always reads as a
 * real month grid.
 */
export function DateGrid({ value, onPick }: { value: string; onPick: (d: string) => void }) {
  const lang = useParkir((s) => s.lang);
  const today = React.useMemo(() => stripTime(new Date()), []);
  const maxDate = React.useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + BOOKING_RANGE_DAYS);
    return d;
  }, [today]);

  const selectedDate = React.useMemo(() => new Date(`${value}T00:00:00`), [value]);
  const [viewYear, setViewYear] = React.useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(selectedDate.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = mondayIndex(firstOfMonth);

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];

  const canGoPrev = new Date(viewYear, viewMonth, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= maxDate;

  function changeMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  return (
    <div>
      {/* month header + prev/next nav */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => canGoPrev && changeMonth(-1)}
          disabled={!canGoPrev}
          aria-label={lang === "id" ? "Bulan sebelumnya" : "Previous month"}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg transition",
            canGoPrev
              ? "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              : "cursor-default text-muted-foreground/25"
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[11.5px] font-bold tracking-tight">
          {MONTH_LABELS[lang as Lang][viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={() => canGoNext && changeMonth(1)}
          disabled={!canGoNext}
          aria-label={lang === "id" ? "Bulan berikutnya" : "Next month"}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg transition",
            canGoNext
              ? "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              : "cursor-default text-muted-foreground/25"
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* weekday header row - Sunday (last column, Monday-first order) in red */}
      <div className="mb-1 grid grid-cols-7">
        {DAY_LABELS[lang as Lang].map((label, i) => (
          <span
            key={label}
            className={cn(
              "text-center text-[8.5px] font-semibold uppercase",
              i === 6 ? "text-red-400" : "text-muted-foreground/70"
            )}
          >
            {label[0]}
          </span>
        ))}
      </div>

      {/* day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`blank-${i}`} />;
          const ds = dateStr(d);
          const isPast = d < today;
          const isBeyondRange = d > maxDate;
          // Campus is closed on Sundays - every Sunday is greyed out/disabled,
          // same treatment as past/out-of-range days.
          const isSunday = d.getDay() === 0;
          const disabled = isPast || isBeyondRange || isSunday;
          const active = ds === value;
          const isToday = d.getTime() === today.getTime();
          return (
            <button
              key={ds}
              type="button"
              onClick={() => !disabled && onPick(ds)}
              disabled={disabled}
              aria-label={
                isSunday
                  ? lang === "id" ? "Tutup di hari Minggu" : "Closed on Sundays"
                  : isPast
                    ? lang === "id" ? "Tanggal sudah lewat" : "Past date"
                    : undefined
              }
              className={cn(
                "tnum mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[11.5px] font-bold transition",
                disabled
                  ? "cursor-default text-muted-foreground/30"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "border border-primary/50 text-primary hover:bg-primary/10"
                      : "text-foreground hover:bg-accent/60"
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TimeGrid({
  value,
  from = TARIFF.openHour * 60,
  onPick,
}: {
  value: string;
  from?: number;
  onPick: (v: string) => void;
}) {
  const active = toMinutes(value);
  const times: number[] = [];
  for (let m = TARIFF.openHour * 60; m <= (TARIFF.closeHour - 1) * 60; m += 30) {
    if (m >= from) times.push(m);
  }
  if (!times.includes(active) && active >= from) times.push(active);
  return (
    <div className="slim-scroll grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto pr-1">
      {times.map((m) => {
        const v = fromMinutes(m);
        const isActive = v === value;
        return (
          <button
            key={v}
            onClick={() => onPick(v)}
            className={cn(
              "tnum rounded-lg border px-1 py-1.5 text-xs font-bold transition",
              isActive
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-card/40 hover:border-primary/30"
            )}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}
