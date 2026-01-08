"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getAccessToken, getJsonWithAuth, patchJsonWithAuth } from "@/lib/api";
import { Hero } from "@/components/home/Hero";
import { getUserRole } from "@/lib/access";

type HeroConfig = {
  imageUrl: string;
  imageAlt: string;
  badgeText: string;
  headlineLines: string[];
  description: string;
  primaryCtaText: string;
  stats: Array<{ value: string; label: string }>;
};

const defaultConfig: HeroConfig = {
  imageUrl: "/images/banner/tattoo-monk.jpg",
  imageAlt: "專業紋身師正在進行精細的紋身工作，展現東方禪意與現代工藝的完美結合",
  badgeText: "Premium Tattoo Studio",
  headlineLines: ["為熱愛刺青的你", "打造專屬體驗"],
  description: "透過 Tattoo CRM 預約、管理與追蹤每一次刺青旅程，讓靈感與工藝在同一個地方匯聚。",
  primaryCtaText: "立即預約",
  stats: [
    { value: "1200+", label: "完成作品" },
    { value: "15", label: "駐店藝術家" },
    { value: "98%", label: "客戶滿意度" },
    { value: "24/7", label: "線上諮詢" },
  ],
};

export default function AdminHomeHeroPage() {
  const role = getUserRole();
  const isBoss = String(role || "").toUpperCase() === "BOSS";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [config, setConfig] = useState<HeroConfig>(defaultConfig);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getJsonWithAuth<HeroConfig>("/admin/site-config/home-hero");
        if (mounted && data) setConfig(data);
      } catch (e: any) {
        if (mounted) setError(e?.message || "載入失敗");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const headline1 = config.headlineLines[0] ?? "";
  const headline2 = config.headlineLines[1] ?? "";

  const canSave = useMemo(() => {
    return (
      config.imageUrl.trim() &&
      config.imageAlt.trim() &&
      config.badgeText.trim() &&
      (headline1.trim() || headline2.trim()) &&
      config.description.trim() &&
      config.primaryCtaText.trim() &&
      config.stats.length === 4 &&
      config.stats.every((s) => s.value.trim() && s.label.trim())
    );
  }, [config, headline1, headline2]);

  const save = async () => {
    if (!isBoss) {
      setError("僅 BOSS 可以修改首頁設定");
      return;
    }
    if (!canSave) {
      setError("請先填寫完整內容（含 4 張統計卡）");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await patchJsonWithAuth<{ success: boolean }>("/admin/site-config/home-hero", config);
      setSuccess("已儲存（首頁將立即更新）");
    } catch (e: any) {
      setError(e?.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File) => {
    if (!isBoss) {
      setError("僅 BOSS 可以上傳圖片");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!file.type.startsWith("image/")) throw new Error("請選擇圖片檔案");
      if (file.size > 10 * 1024 * 1024) throw new Error("圖片大小不能超過 10MB");

      const form = new FormData();
      form.append("image", file);

      const token = getAccessToken();
      const res = await fetch("/api/admin/site-config/home-hero/upload-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const text = await res.text().catch(() => "");
      const data = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })();
      if (!res.ok) throw new Error(data?.message || text || `上傳失敗 (${res.status})`);
      if (!data?.url) throw new Error("上傳成功但缺少圖片 URL");
      setConfig((prev) => ({ ...prev, imageUrl: data.url }));
      setSuccess("圖片已上傳，記得按「儲存」套用");
    } catch (e: any) {
      setError(e?.message || "上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 bg-white dark:bg-[var(--bg)] text-gray-900 dark:text-white space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">首頁 Hero 設定</h1>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
          僅 BOSS 可修改首頁主圖、文案與右側統計卡。
        </p>
      </div>

      {!isBoss ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          目前角色不是 BOSS，沒有修改權限。
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>背景圖</Label>
            <div className="flex gap-2">
              <Input
                value={config.imageUrl}
                onChange={(e) => setConfig((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="貼上圖片 URL 或 /uploads/... /images/..."
              />
              <label className="inline-flex items-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f);
                    e.currentTarget.value = "";
                  }}
                />
                <Button type="button" variant="outline" disabled={!isBoss || uploading}>
                  {uploading ? "上傳中..." : "上傳"}
                </Button>
              </label>
            </div>
            <div className="space-y-2">
              <Label>背景圖 alt</Label>
              <Input
                value={config.imageAlt}
                onChange={(e) => setConfig((p) => ({ ...p, imageAlt: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>小標</Label>
            <Input value={config.badgeText} onChange={(e) => setConfig((p) => ({ ...p, badgeText: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>主標題（兩行）</Label>
            <Input
              value={headline1}
              onChange={(e) =>
                setConfig((p) => ({ ...p, headlineLines: [e.target.value, p.headlineLines[1] ?? ""] }))
              }
              placeholder="第一行"
            />
            <Input
              value={headline2}
              onChange={(e) =>
                setConfig((p) => ({ ...p, headlineLines: [p.headlineLines[0] ?? "", e.target.value] }))
              }
              placeholder="第二行"
            />
          </div>

          <div className="space-y-2">
            <Label>副標描述</Label>
            <Textarea
              value={config.description}
              onChange={(e) => setConfig((p) => ({ ...p, description: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>主 CTA 文字</Label>
            <Input
              value={config.primaryCtaText}
              onChange={(e) => setConfig((p) => ({ ...p, primaryCtaText: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <Label>右側統計卡（4 張）</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 dark:border-white/10 p-3 space-y-2">
                  <div className="text-xs text-gray-500">第 {idx + 1} 張</div>
                  <Input
                    value={config.stats[idx]?.value ?? ""}
                    onChange={(e) =>
                      setConfig((p) => {
                        const next = [...p.stats];
                        while (next.length < 4) next.push({ value: "", label: "" });
                        next[idx] = { ...next[idx], value: e.target.value };
                        return { ...p, stats: next };
                      })
                    }
                    placeholder="數字（如 1200+）"
                  />
                  <Input
                    value={config.stats[idx]?.label ?? ""}
                    onChange={(e) =>
                      setConfig((p) => {
                        const next = [...p.stats];
                        while (next.length < 4) next.push({ value: "", label: "" });
                        next[idx] = { ...next[idx], label: e.target.value };
                        return { ...p, stats: next };
                      })
                    }
                    placeholder="標籤（如 完成作品）"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={!isBoss || saving || loading || !canSave}>
              {saving ? "儲存中..." : "儲存"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setConfig(defaultConfig);
                setError(null);
                setSuccess(null);
              }}
              disabled={saving || loading}
            >
              還原預設
            </Button>
          </div>

          {loading ? <div className="text-sm text-gray-500">載入中...</div> : null}
        </div>

        <div className="space-y-3">
          <div className="text-sm text-gray-500">預覽</div>
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
            <Hero loggedIn={true} config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}


