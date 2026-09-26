"use client";
/** Shared window picker bits - date chips + half-hour time grid in popovers. */
import React from "react";
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
  children,
}: {
  label: string;
  display: string;
  icon: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
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
        className="w-64 rounded-2xl border-border bg-popover/95 p-3 backdrop-blur-xl"
        align="center"
      >
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}

export function DateGrid({ value, onPick }: { value: string; onPick: (d: string) => void }) {
  const lang = useParkir((s) => s.lang);
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86400_000));
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {days.map((d) => {
        const ds = dateStr(d);
        const active = ds === value;
        return (
          <button
            key={ds}
            onClick={() => onPick(ds)}
            className={cn(
              "flex flex-col items-center rounded-xl border px-2 py-2 transition",
              active
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-card/40 hover:border-primary/30"
            )}
          >
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">
              {DAY_LABELS[lang as Lang][d.getDay() === 0 ? 6 : d.getDay() - 1]}
            </span>
            <span className="tnum text-sm font-bold">{d.getDate()}</span>
          </button>
        );
      })}
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
