"use client";
/** AdminAds — advertisement management CRUD (PRD §28.2). */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coffee, CarFront, PartyPopper, Megaphone, Plus, Trash2, Power, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Ad {
  id: string; title: string; description: string | null; imageTheme: string;
  imageUrl: string | null; ctaText: string; destinationUrl: string | null; status: string;
  startAt: string; endAt: string;
}

const THEME_ICON: Record<string, React.ComponentType<{ className?: string }>> = { coffee: Coffee, carwash: CarFront, event: PartyPopper, image: ImageIcon };

export function AdminAds() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", ctaText: "Kunjungi", destinationUrl: "", imageTheme: "coffee", imageUrl: "" });
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery<{ ads: Ad[] }>({
    queryKey: ["adminAds"],
    queryFn: async () => (await fetch("/api/ads")).json(),
  });

  async function create() {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(t("save") + " ✔");
        setOpen(false);
        setForm({ title: "", description: "", ctaText: "Kunjungi", destinationUrl: "", imageTheme: "coffee", imageUrl: "" });
        qc.invalidateQueries({ queryKey: ["adminAds"] });
        qc.invalidateQueries({ queryKey: ["ads"] });
      } else toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(ad: Ad) {
    const res = await fetch("/api/ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ad.id, status: ad.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    });
    if (res.ok) {
      qc.invalidateQueries({ queryKey: ["adminAds"] });
      qc.invalidateQueries({ queryKey: ["ads"] });
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/ads?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t("delete") + " ✔");
      qc.invalidateQueries({ queryKey: ["adminAds"] });
      qc.invalidateQueries({ queryKey: ["ads"] });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-base font-bold">
          <Megaphone className="h-5 w-5 text-primary" /> {t("admAds")} ({data?.ads.length ?? 0})
        </h1>
        <Button size="sm" className="rounded-lg" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> {t("createAd")}
        </Button>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3">
        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">💡 Tips iklan</p>
        <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300">
          Beberapa iklan akan ditampilkan dalam carousel slider. Pengguna bisa swipe kiri-kanan untuk melihat semua iklan aktif.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : !data?.ads.length ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("noAds")}</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {data.ads.map((ad) => {
            const Icon = THEME_ICON[ad.imageTheme] || Coffee;
            const isCustomImage = ad.imageTheme === "image" && ad.imageUrl;
            return (
              <Card key={ad.id} className="rounded-xl">
                <CardContent className="flex items-center gap-3 p-3">
                  {isCustomImage ? (
                    <img 
                      src={ad.imageUrl!} 
                      alt={ad.title}
                      className="h-10 w-10 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900">
                      <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {ad.title}
                      <Badge variant="secondary" className={ad.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}>
                        {ad.status === "ACTIVE" ? t("adActive") : t("adInactive")}
                      </Badge>
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{ad.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      CTA: {ad.ctaText} · {ad.destinationUrl || "—"} · s/d {new Date(ad.endAt).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggle(ad)} aria-label="toggle">
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(ad.id)} aria-label={t("delete")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("createAd")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("adTitle")} *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white dark:bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("adDesc")}</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white dark:bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("adCta")}</Label>
                <Input value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} className="bg-white dark:bg-background" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tema</Label>
                <div className="flex gap-1">
                  {Object.keys(THEME_ICON).map((th) => {
                    const I = THEME_ICON[th];
                    return (
                      <button
                        key={th}
                        type="button"
                        onClick={() => setForm({ ...form, imageTheme: th })}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border ${form.imageTheme === th ? "border-primary bg-accent" : "bg-white"}`}
                      >
                        <I className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("adUrl")}</Label>
              <Input placeholder="https://…" value={form.destinationUrl} onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })} className="bg-white dark:bg-background" />
            </div>
            {form.imageTheme === "image" && (
              <div className="space-y-1">
                <Label className="text-xs">URL Gambar</Label>
                <Input placeholder="https://example.com/image.jpg" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="bg-white dark:bg-background" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={create} disabled={busy || !form.title.trim()}>{busy ? t("loading") : t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
