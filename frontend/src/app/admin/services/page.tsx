"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, deleteJsonWithAuth, postJsonWithAuth, putJsonWithAuth, patchJsonWithAuth, ApiError, getImageUrl, getApiBase } from "@/lib/api";
import { hasAdminAccess, isBossRole } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Plus, Edit, Trash2, ArrowLeft, Image as ImageIcon, Package, CheckCircle, XCircle, Sliders } from "lucide-react";
import { ServiceImageSelector } from "@/components/admin/ServiceImageSelector";
import { VariantManager } from "@/components/admin/VariantManager";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SERVICE_DISPLAY_ORDER, SERVICE_ORDER_MAP } from "@/constants/service-order";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMin: number;
  currency: string;
  category: string | null;
  imageUrl: string | null;
  hasVariants: boolean;
  isActive: boolean;
  createdAt: string;
}

type RepriceRow = {
  serviceId: string;
  name: string;
  isActive: boolean;
  oldPrice: number;
  candidatePrice: number | null;
  notes: string;
  hasActiveVariants: boolean;
};

const ALLOWED_SERVICE_NAME_SET = new Set<string>(SERVICE_DISPLAY_ORDER);

const sortServicesByDisplayOrder = (list: Service[]) => {
  const seen = new Set<string>();
  return list
    .filter((service) => {
      if (!ALLOWED_SERVICE_NAME_SET.has(service.name)) {
        return false;
      }
      if (seen.has(service.name)) {
        return false;
      }
      seen.add(service.name);
      return true;
    })
    .sort((a, b) => {
      const orderA = SERVICE_ORDER_MAP[a.name] ?? Number.MAX_SAFE_INTEGER;
      const orderB = SERVICE_ORDER_MAP[b.name] ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name, "zh-Hant");
    });
};

export default function AdminServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [initializingVariant, setInitializingVariant] = useState<string | null>(null);
  const [managingVariantService, setManagingVariantService] = useState<{ id: string; name: string } | null>(null);
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(null);
  const [repriceLoading, setRepriceLoading] = useState(false);
  const [repriceRows, setRepriceRows] = useState<RepriceRow[] | null>(null);
  const [overridePrices, setOverridePrices] = useState<Record<string, string>>({});
  const [repriceApplying, setRepriceApplying] = useState(false);
  const [repriceSelectedIds, setRepriceSelectedIds] = useState<Record<string, boolean>>({});
  const [repriceRowApplyingId, setRepriceRowApplyingId] = useState<string | null>(null);

const DEFAULT_DESCRIPTION = "尚未設定";
const DEFAULT_PRICE = "1"; // 必須 > 0，只作佔位值
const DEFAULT_DURATION = "60";
const DEFAULT_CURRENCY = "TWD";

const defaultFormValues = {
  name: "",
  description: DEFAULT_DESCRIPTION,
  price: DEFAULT_PRICE,
  durationMin: DEFAULT_DURATION,
  currency: DEFAULT_CURRENCY,
  category: "",
  imageUrl: "",
  isActive: false,
};

  // Form state
  const [formData, setFormData] = useState(defaultFormValues);

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || !hasAdminAccess(userRole) || !isBossRole(userRole)) {
      router.replace('/profile');
      return;
    }

    fetchServices();
  }, [router]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth<Service[]>("/admin/services");

      // 只過濾和排序，不自動刪除
      // 讓用戶手動管理哪些服務需要刪除
      let allowedServices = data.filter((service) =>
        ALLOWED_SERVICE_NAME_SET.has(service.name)
      );

      // 處理重複服務：只保留最早創建的，其他標記為重複但不自動刪除
      const servicesByName = new Map<string, Service>();
      allowedServices.forEach((service) => {
        const existing = servicesByName.get(service.name);
        if (!existing) {
          servicesByName.set(service.name, service);
        } else {
          // 保留創建時間較早的
          const existingTime = new Date(existing.createdAt).getTime();
          const currentTime = new Date(service.createdAt).getTime();
          if (currentTime < existingTime) {
            servicesByName.set(service.name, service);
          }
        }
      });

      allowedServices = Array.from(servicesByName.values());
      allowedServices.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const orderedServices = sortServicesByDisplayOrder(allowedServices);
      setServices(orderedServices);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "載入服務資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceActive = async (service: Service, nextActive: boolean) => {
    try {
      setTogglingServiceId(service.id);
      await patchJsonWithAuth(`/admin/services/${service.id}/active`, { isActive: nextActive });
      // Update UI immediately (and then refresh list for safety)
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, isActive: nextActive } : s)));
      setRepriceRows((prev) => (prev ? prev.map((r) => (r.serviceId === service.id ? { ...r, isActive: nextActive } : r)) : prev));
      await fetchServices();
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "更新服務狀態失敗");
    } finally {
      setTogglingServiceId(null);
    }
  };

  const downloadBasePricesCsv = async () => {
    try {
      setExporting(true);
      setError(null);
      const token = getAccessToken();
      if (!token) {
        setError("需要登入後才能匯出");
        return;
      }
      // Use same-origin rewrites; include Bearer token
      const res = await fetch(`/api/admin/services/export.csv`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `匯出失敗（${res.status}）`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `services-base-prices-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "匯出失敗";
      setError(msg);
    } finally {
      setExporting(false);
    }
  };

  const loadRepriceDryRun = async () => {
    try {
      setRepriceLoading(true);
      setError(null);
      const resp = await postJsonWithAuth<{ rows: RepriceRow[] }>(`/admin/services/reprice/dry-run`, {});
      setRepriceRows(resp.rows || []);
      setOverridePrices({});
      setRepriceSelectedIds({});
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "載入重訂預覽失敗");
    } finally {
      setRepriceLoading(false);
    }
  };

  const applyCandidateToRows = (serviceIds: string[]) => {
    if (!repriceRows) return;
    const byId = new Map(repriceRows.map((r) => [r.serviceId, r]));
    setOverridePrices((prev) => {
      const next = { ...prev };
      for (const id of serviceIds) {
        const r = byId.get(id);
        if (r && typeof r.candidatePrice === "number" && r.candidatePrice > 0) {
          next[id] = String(r.candidatePrice);
        }
      }
      return next;
    });
  };

  const toggleSelectAllRepriceRows = (checked: boolean) => {
    if (!repriceRows) return;
    const next: Record<string, boolean> = {};
    for (const r of repriceRows) next[r.serviceId] = checked;
    setRepriceSelectedIds(next);
  };

  const selectedRepriceIds = useMemo(() => {
    return Object.entries(repriceSelectedIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }, [repriceSelectedIds]);

  const fillOverridesWithCandidate = () => {
    if (!repriceRows) return;
    const next: Record<string, string> = { ...overridePrices };
    for (const r of repriceRows) {
      if (r.candidatePrice && r.candidatePrice > 0) {
        next[r.serviceId] = String(r.candidatePrice);
      }
    }
    setOverridePrices(next);
  };

  const applyOverridePrices = async () => {
    if (!repriceRows) return;
    const overrides: Record<string, number> = {};
    for (const [id, raw] of Object.entries(overridePrices)) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) continue;
      overrides[id] = Math.trunc(n);
    }
    if (!Object.keys(overrides).length) {
      setError("請至少輸入一筆要套用的基礎價");
      return;
    }
    if (!confirm("確定要套用你輸入的基礎價嗎？此操作會直接更新 DB 的 Service.price")) return;

    try {
      setRepriceApplying(true);
      setError(null);
      await postJsonWithAuth(`/admin/services/reprice/apply`, { overrides, confirm: "APPLY" });
      await fetchServices();
      await loadRepriceDryRun();
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "套用基礎價失敗");
    } finally {
      setRepriceApplying(false);
    }
  };

  const applyRowOverrideNow = async (serviceId: string) => {
    if (!repriceRows) return;
    const raw = overridePrices[serviceId] ?? "";
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      setError("此列沒有可套用的手動覆蓋價（需 > 0）");
      return;
    }
    try {
      setRepriceRowApplyingId(serviceId);
      setError(null);
      await postJsonWithAuth(`/admin/services/reprice/apply`, {
        overrides: { [serviceId]: Math.trunc(n) },
        confirm: "APPLY",
      });
      await fetchServices();
      await loadRepriceDryRun();
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "套用手動價失敗");
    } finally {
      setRepriceRowApplyingId(null);
    }
  };

  const scrollFormIntoView = () => {
    setTimeout(() => {
      const editForm = document.getElementById("edit-service-form");
      if (editForm) {
        editForm.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      }
    }, 100);
  };

  const resetForm = () => {
    setFormData(defaultFormValues);
    setEditingService(null);
    setShowCreateForm(false);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ALLOWED_SERVICE_NAME_SET.has(formData.name)) {
      setError("服務名稱必須符合指定清單，請確認後再新增。");
      return;
    }

    if (services.some((service) => service.name === formData.name)) {
      setError("此服務名稱已存在，請直接編輯既有項目。");
      return;
    }

    try {
      const newService = (await postJsonWithAuth("/admin/services", {
        name: formData.name,
        description: formData.description?.trim() || DEFAULT_DESCRIPTION,
        price: Number(formData.price) > 0 ? Number(formData.price) : Number(DEFAULT_PRICE),
        durationMin:
          Number(formData.durationMin) > 0
            ? Number(formData.durationMin)
            : Number(DEFAULT_DURATION),
        currency: formData.currency || DEFAULT_CURRENCY,
        category: formData.category,
        imageUrl: formData.imageUrl,
        isActive: formData.isActive,
        hasVariants: true, // 新服務默認啟用規格功能
      })) as Service;
      setServices((prev) => sortServicesByDisplayOrder([...prev, newService]));
      resetForm();
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "新增服務失敗");
    }
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setFormData({
      ...defaultFormValues,
      name: service.name,
      description: service.description?.trim()
        ? service.description
        : DEFAULT_DESCRIPTION,
      price: String(service.price ?? DEFAULT_PRICE),
      durationMin: String(service.durationMin ?? DEFAULT_DURATION),
      currency: service.currency || DEFAULT_CURRENCY,
      category: service.category || "",
      imageUrl: service.imageUrl || "",
      isActive: service.isActive,
    });
    setShowCreateForm(true);
    
    // 自動滾動到編輯表單
    scrollFormIntoView();
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    if (!ALLOWED_SERVICE_NAME_SET.has(formData.name)) {
      setError("服務名稱必須符合指定清單，請勿修改為未授權的名稱。");
      return;
    }

    if (
      formData.name !== editingService.name &&
      services.some((service) => service.name === formData.name)
    ) {
      setError("已有相同名稱的服務，請改用其他名稱。");
      return;
    }

    try {
      const updatedService = (await putJsonWithAuth(
        `/admin/services/${editingService.id}`,
        {
          name: formData.name,
          description: formData.description?.trim()
            ? formData.description
            : DEFAULT_DESCRIPTION,
          category: formData.category,
          imageUrl: formData.imageUrl,
          isActive: formData.isActive,
          // 不更新 price, durationMin, currency（由規格管理）
        }
      )) as Service;
      setServices((prev) =>
        sortServicesByDisplayOrder(
          prev.map((service) =>
            service.id === editingService.id ? updatedService : service
          )
        )
      );
      resetForm();
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "更新服務失敗");
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('確定要刪除這個服務嗎？此操作無法復原。')) {
      return;
    }

    try {
      await deleteJsonWithAuth(`/admin/services/${serviceId}`);
      setServices((prev) =>
        sortServicesByDisplayOrder(prev.filter((service) => service.id !== serviceId))
      );
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "刪除服務失敗");
    }
  };

  const servicesByName = useMemo(() => {
    const map = new Map<string, Service>();
    services.forEach((service) => {
      if (!map.has(service.name)) {
        map.set(service.name, service);
      }
    });
    return map;
  }, [services]);

  const displayServiceRows = useMemo(
    () =>
      SERVICE_DISPLAY_ORDER.map((name) => ({
        name,
        service: servicesByName.get(name) ?? null,
      })),
    [servicesByName]
  );

  const handleQuickCreate = (name: string) => {
    setEditingService(null);
    setFormData({
      ...defaultFormValues,
      name,
    });
    setError(null);
    setShowCreateForm(true);
    scrollFormIntoView();
  };

  // 初始化服務規格
  const handleInitializeVariants = async (serviceId: string) => {
    if (!confirm('確定要初始化此服務的規格嗎？\n\n將會創建：\n- 12個尺寸選項（5-6cm 到 16-17cm）\n- 2種顏色（黑白、彩色）\n- 6個部位選項\n- 1個設計費選項')) {
      return;
    }

    setInitializingVariant(serviceId);
    try {
      const response = await fetch(`${getApiBase()}/admin/service-variants/initialize/${serviceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ template: 'standard' }),
      });

      if (!response.ok) {
        throw new Error('初始化規格失敗');
      }

      const result = await response.json();
      alert(`✅ 成功！已創建 ${result.count} 個規格`);
      
      // 重新獲取服務列表
      await fetchServices();
    } catch (err) {
      alert(err instanceof Error ? err.message : '初始化規格失敗');
    } finally {
      setInitializingVariant(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-muted-light dark:text-text-muted-dark">載入服務資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 bg-white dark:bg-[var(--bg)] text-gray-900 dark:text-white">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center text-3xl font-bold text-text-primary-light dark:text-text-primary-dark">
              <Settings className="mr-3 h-8 w-8" />
              管理服務項目
            </h1>
            <p className="mt-2 text-text-muted-light dark:text-text-muted-dark">
              管理系統中的刺青服務項目
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="secondary"
              onClick={downloadBasePricesCsv}
              disabled={exporting}
              className="flex w-full items-center justify-center space-x-2 sm:w-auto"
              title="匯出 DB 上的服務基礎價（含停用）"
            >
              <Package className="h-4 w-4" />
              <span>{exporting ? "匯出中..." : "匯出基礎價 CSV"}</span>
            </Button>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex w-full items-center justify-center space-x-2 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span>新增服務</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex w-full items-center justify-center space-x-2 sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>回上一頁</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總服務數</CardTitle>
            <Settings className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">啟用服務</CardTitle>
            <Settings className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {services.filter(service => service.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">停用服務</CardTitle>
            <Settings className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {services.filter(service => !service.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Base price reprice tool (BOSS-only) */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>基礎價重訂（Service.price）</CardTitle>
          <CardDescription>
            系統會以「啟用規格」試算每個服務的最低可達價作為候選值；你可在下方手動輸入覆蓋價，並只套用你有填的那些服務。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={loadRepriceDryRun} disabled={repriceLoading}>
              {repriceLoading ? "載入中..." : "產生預覽"}
            </Button>
            <Button
              onClick={applyOverridePrices}
              disabled={!repriceRows || repriceApplying}
              className="sm:ml-auto"
              title="只會套用你有輸入價格的服務"
            >
              {repriceApplying ? "套用中..." : "套用手動價格"}
            </Button>
            <Button
              variant="secondary"
              className="shadow-sm hover:shadow"
              onClick={() => applyCandidateToRows(selectedRepriceIds)}
              disabled={!repriceRows || repriceLoading || selectedRepriceIds.length === 0}
              title="將勾選列的候選價填入輸入欄位（你仍可逐筆調整）"
            >
              批次套用候選價（勾選）
            </Button>
            <Button
              variant="secondary"
              className="shadow-sm hover:shadow"
              onClick={fillOverridesWithCandidate}
              disabled={!repriceRows || repriceLoading}
              title="將候選價批次填入輸入欄位（你仍可逐筆調整）"
            >
              全列套用候選價
            </Button>
          </div>

          {repriceRows ? (
            <div className="mt-4 overflow-auto rounded-md border border-gray-200">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 w-[44px]">
                      <input
                        type="checkbox"
                        aria-label="全選"
                        checked={repriceRows.length > 0 && repriceRows.every((r) => repriceSelectedIds[r.serviceId] === true)}
                        onChange={(e) => toggleSelectAllRepriceRows(e.target.checked)}
                      />
                    </th>
                    <th className="text-left py-2 px-3">服務</th>
                    <th className="text-left py-2 px-3">狀態</th>
                    <th className="text-right py-2 px-3">舊基礎價</th>
                    <th className="text-right py-2 px-3">候選最低價</th>
                    <th className="text-right py-2 px-3">手動覆蓋價</th>
                    <th className="text-left py-2 px-3">備註</th>
                    <th className="text-left py-2 px-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {repriceRows.map((r) => {
                    const raw = overridePrices[r.serviceId] ?? "";
                    const parsed = Number(raw);
                    const willApply = Number.isFinite(parsed) && parsed > 0;
                    return (
                      <tr key={r.serviceId} className="border-t">
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            aria-label={`選取 ${r.name}`}
                            checked={repriceSelectedIds[r.serviceId] === true}
                            onChange={(e) =>
                              setRepriceSelectedIds((prev) => ({ ...prev, [r.serviceId]: e.target.checked }))
                            }
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-gray-500">{r.serviceId}</div>
                        </td>
                        <td className="py-2 px-3">{r.isActive ? "啟用" : "停用"}</td>
                        <td className="py-2 px-3 text-right">NT$ {Number(r.oldPrice || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">
                          {typeof r.candidatePrice === "number" ? `NT$ ${r.candidatePrice.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={100}
                            value={raw}
                            onChange={(e) =>
                              setOverridePrices((prev) => ({ ...prev, [r.serviceId]: e.target.value }))
                            }
                            className={`w-40 rounded-md border px-2 py-1 text-right ${willApply ? "border-blue-400" : "border-gray-300"}`}
                            placeholder="（不套用）"
                          />
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-600">{r.notes}</td>
                        <td className="py-2 px-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                操作
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={6}>
                              <DropdownMenuItem
                                disabled={typeof r.candidatePrice !== "number" || r.candidatePrice <= 0}
                                onSelect={() => applyCandidateToRows([r.serviceId])}
                              >
                                套用候選價
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={repriceRowApplyingId === r.serviceId || !(Number.isFinite(parsed) && parsed > 0)}
                                onSelect={() => applyRowOverrideNow(r.serviceId)}
                              >
                                {repriceRowApplyingId === r.serviceId ? "套用中..." : "套用手動價"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={togglingServiceId === r.serviceId}
                                onSelect={() =>
                                  toggleServiceActive(
                                    ({ id: r.serviceId, name: r.name, isActive: r.isActive } as any) as Service,
                                    !r.isActive,
                                  )
                                }
                              >
                                {togglingServiceId === r.serviceId ? "更新中..." : r.isActive ? "停用" : "啟用"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 text-sm text-gray-600">尚未載入預覽。</div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card id="edit-service-form" className="mb-8">
          <CardHeader>
            <CardTitle>
              {editingService ? '編輯服務項目' : '新增服務項目'}
            </CardTitle>
            <CardDescription>
              {editingService ? '更新服務項目資訊' : '新增一個新的刺青服務項目'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingService ? handleUpdateService : handleCreateService} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary-dark mb-2">
                    服務名稱 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary-dark mb-2">
                    分類
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                    placeholder="例如：傳統刺青、寫實風格"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary-dark mb-2">
                  服務描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                  placeholder="詳細描述此服務項目"
                />
              </div>

              {/* 價格、時長、幣別由規格管理，不在此編輯 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">價格由規格管理</h4>
                    <p className="text-sm text-blue-700">
                      此服務的價格、時長和幣別由「規格管理」功能設定。
                      請點擊服務列表中的「規格」按鈕進行設置。
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary-dark mb-2">
                  服務圖片
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                    placeholder="/uploads/services/arm/example.jpg"
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowImageSelector(true)}
                    className="px-4"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    選擇圖片
                  </Button>
                </div>
                {formData.imageUrl && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">預覽：</div>
                    <div className="w-20 h-20 border rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <img
                        src={getImageUrl(formData.imageUrl)}
                        alt="預覽"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('❌ 編輯表單圖片預覽載入失敗:', getImageUrl(formData.imageUrl));
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-text-secondary-dark">
                  啟用狀態
                </label>
              </div>

              <div className="flex space-x-2">
                <Button type="submit">
                  {editingService ? '更新服務' : '新增服務'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="action-btn-cancel">
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>服務項目列表</CardTitle>
          <CardDescription>
            管理系統中的所有刺青服務項目
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">服務名稱</th>
                  <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">分類</th>
                  <th className="text-center py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">圖片</th>
                  <th className="text-center py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">規格</th>
                  <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">狀態</th>
                  <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">操作</th>
                </tr>
              </thead>
              <tbody>
                {displayServiceRows.map(({ name, service }) => {
                  const isPlaceholder = !service;
                  return (
                    <tr
                      key={name}
                      className="border-b border-gray-100 dark:border-gray-700"
                    >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-text-primary-light dark:text-text-primary-dark">
                          {name}
                        </div>
                        {service?.description && (
                          <div className="text-sm text-text-muted-light dark:text-text-muted-dark">
                            {service.description}
                          </div>
                        )}
                        {isPlaceholder && (
                          <div className="text-xs text-red-400 dark:text-red-300 mt-1">
                            尚未建立此服務項目
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-muted-light dark:text-text-secondary-dark">
                      {service?.category || (isPlaceholder ? "—" : "未分類")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {service?.imageUrl ? (
                        <div className="flex flex-col items-center space-y-1">
                          <div 
                            className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                            onClick={() => setPreviewImage(service.imageUrl!)}
                            title="點擊查看大圖"
                          >
                            <img
                              src={getImageUrl(service.imageUrl)}
                              alt={service.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('❌ 圖片載入失敗:', getImageUrl(service.imageUrl));
                                e.currentTarget.style.display = 'none';
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextElement) {
                                  nextElement.style.display = 'flex';
                                }
                              }}
                            />
                            <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center" style={{ display: 'none' }}>
                              <ImageIcon className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">有圖片</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-1">
                          <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">無圖片</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {service?.hasVariants ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          已設定
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          未設定
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        service?.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-600' 
                          : 'bg-gray-100 text-text-primary-light dark:bg-gray-900 dark:text-text-secondary-dark'
                      }`}>
                        {service
                          ? service.isActive
                            ? "啟用"
                            : "停用"
                          : "未建立"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-2">
                        {service ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleServiceActive(service, !service.isActive)}
                              disabled={togglingServiceId === service.id}
                              className="flex items-center space-x-1"
                              title={service.isActive ? "停用此服務（將不再出現在新增預約/前台）" : "啟用此服務"}
                            >
                              {togglingServiceId === service.id ? (
                                <>
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-transparent"></div>
                                  <span>更新中...</span>
                                </>
                              ) : (
                                <span>{service.isActive ? "停用" : "啟用"}</span>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditService(service)}
                              className="flex items-center space-x-1 action-btn-edit"
                            >
                              <Edit className="h-3 w-3" />
                              <span>編輯</span>
                            </Button>
                            {service.hasVariants ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setManagingVariantService({
                                    id: service.id,
                                    name: service.name,
                                  })
                                }
                                className="flex items-center space-x-1 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                              >
                                <Sliders className="h-3 w-3" />
                                <span>管理規格</span>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleInitializeVariants(service.id)}
                                disabled={initializingVariant === service.id}
                                className="flex items-center space-x-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              >
                                {initializingVariant === service.id ? (
                                  <>
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                                    <span>處理中...</span>
                                  </>
                                ) : (
                                  <>
                                    <Package className="h-3 w-3" />
                                    <span>設定規格</span>
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteService(service.id)}
                              className="flex items-center space-x-1 action-btn-delete"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>刪除</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickCreate(name)}
                            className="flex items-center space-x-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                          >
                            <Plus className="h-3 w-3" />
                            <span>快速新增</span>
                          </Button>
                        )}
                      </div>
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {displayServiceRows.every((row) => !row.service) && (
            <div className="text-center py-8 text-text-muted-light dark:text-text-muted-dark">
              目前尚未建立任何服務項目，請使用「快速新增」或「新增服務」。
            </div>
          )}
        </CardContent>
      </Card>

      {/* 圖片預覽模態框 */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setPreviewImage(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">圖片預覽</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={getImageUrl(previewImage)}
                alt="預覽圖片"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  console.error('❌ 預覽圖片載入失敗:', getImageUrl(previewImage));
                  e.currentTarget.src = '/images/placeholder-image.png';
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 圖片選擇器 */}
      <ServiceImageSelector
        isOpen={showImageSelector}
        onClose={() => setShowImageSelector(false)}
        onSelect={(imageUrl) => {
          console.log('📸 服務圖片選擇回調，更新 formData.imageUrl:', imageUrl);
          setFormData(prev => ({ ...prev, imageUrl }));
          setShowImageSelector(false);
        }}
        currentImageUrl={formData.imageUrl}
      />

      {/* 規格管理器 */}
      {managingVariantService && (
        <VariantManager
          serviceId={managingVariantService.id}
          serviceName={managingVariantService.name}
          onClose={() => setManagingVariantService(null)}
          onUpdate={fetchServices}
        />
      )}
    </div>
  );
}