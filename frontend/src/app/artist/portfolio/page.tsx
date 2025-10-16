"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteJsonWithAuth,
  getApiBase,
  getJsonWithAuth,
  postFormDataWithAuth,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TopBar } from "@/components/toolbar/TopBar";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { Chip } from "@/components/toolbar/Chip";
import { FloatingActions } from "@/components/toolbar/FloatingActions";
import { FilterDrawer } from "@/components/filter-drawer/FilterDrawer";
import { EmptyState, WorkCard, WorkCardSkeleton } from "@/components/work-card/WorkCard";
import { Camera, Image as ImageIcon, Loader2, Save, X } from "lucide-react";

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  status?: string;
  price?: number;
}

type PendingDelete =
  | { type: "single"; item: PortfolioItem }
  | { type: "bulk"; ids: string[]; referenceTitle: string };

const AVAILABLE_TAGS = [
  "背後左或右圖",
  "半胛圖",
  "排胛圖",
  "腹肚圖",
  "大背到大腿圖",
  "大背後圖",
  "大腿表面",
  "大腿全包",
  "大小腿包全肢",
  "單胸腹肚圖",
  "單胸到包全手",
  "單胸口",
  "前手臂",
  "小腿表面",
  "小腿全包",
  "上下手臂全肢",
  "上手臂",
  "雙前胸口圖",
  "雙胸到腹肚圖",
];

const createInitialFilters = () => ({
  dateRange: { from: null as string | null, to: null as string | null },
  priceRange: { min: "", max: "" },
  statuses: [] as string[],
  bodyParts: [] as string[],
});

const getStatusLabel = (status?: string) => {
  if (!status) return "已發布";
  switch (status.toLowerCase()) {
    case "draft":
      return "草稿";
    case "hidden":
    case "archived":
      return "隱藏";
    case "published":
    default:
      return "已發布";
  }
};

export default function ArtistPortfolio() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isChipMultiSelect, setIsChipMultiSelect] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(createInitialFilters());
  const [draftFilters, setDraftFilters] = useState(createInitialFilters());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: [] as string[],
    image: null as File | null,
  });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  useEffect(() => {
    const handler = window.setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => window.clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    if (!isChipMultiSelect && selectedTags.length > 1) {
      setSelectedTags(selectedTags.slice(0, 1));
    }
  }, [isChipMultiSelect, selectedTags]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth<PortfolioItem[]>("/artist/portfolio");
      const apiBase = getApiBase();
      const normalized = data.map((item) => ({
        ...item,
        imageUrl: item.imageUrl?.startsWith("http") ? item.imageUrl : `${apiBase}${item.imageUrl}`,
        status: getStatusLabel(item.status),
      }));
      setPortfolioItems(normalized);
      setError(null);
    } catch (err) {
      console.error("Portfolio fetch error:", err);
      setError("載入作品失敗");
    } finally {
      setLoading(false);
    }
  };

  const availableBodyParts = useMemo(() => {
    const tags = new Set<string>();
    portfolioItems.forEach((item) => {
      item.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [portfolioItems]);

  useEffect(() => {
    setAdvancedFilters((prev) => {
      const filtered = prev.bodyParts.filter((tag) => availableBodyParts.includes(tag));
      if (filtered.length === prev.bodyParts.length) {
        return prev;
      }
      return { ...prev, bodyParts: filtered };
    });
    setDraftFilters((prev) => {
      const filtered = prev.bodyParts.filter((tag) => availableBodyParts.includes(tag));
      if (filtered.length === prev.bodyParts.length) {
        return prev;
      }
      return { ...prev, bodyParts: filtered };
    });
  }, [availableBodyParts]);

  const activeFiltersCount = useMemo(() => {
    const counts = [
      advancedFilters.dateRange.from || advancedFilters.dateRange.to,
      advancedFilters.priceRange.min !== "" || advancedFilters.priceRange.max !== "",
      advancedFilters.statuses.length > 0,
      advancedFilters.bodyParts.length > 0,
    ];
    return counts.filter(Boolean).length;
  }, [advancedFilters]);

  const filteredItems = useMemo(() => {
    const minPrice = advancedFilters.priceRange.min ? Number(advancedFilters.priceRange.min) : null;
    const maxPrice = advancedFilters.priceRange.max ? Number(advancedFilters.priceRange.max) : null;

    return portfolioItems.filter((item) => {
      const searchTarget = [item.title, item.description, item.tags.join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = searchTarget.includes(debouncedSearch.trim().toLowerCase());

      const matchesTags = selectedTags.length === 0
        ? true
        : isChipMultiSelect
          ? selectedTags.every((tag) => item.tags.includes(tag))
          : selectedTags.some((tag) => item.tags.includes(tag));

      const matchesStatus =
        advancedFilters.statuses.length === 0 ||
        advancedFilters.statuses.includes(getStatusLabel(item.status));

      const matchesBodyParts =
        advancedFilters.bodyParts.length === 0 ||
        advancedFilters.bodyParts.every((tag) => item.tags.includes(tag));

      const matchesDate = (() => {
        if (!advancedFilters.dateRange.from && !advancedFilters.dateRange.to) {
          return true;
        }
        const createdAt = new Date(item.createdAt).getTime();
        if (Number.isNaN(createdAt)) return true;
        if (advancedFilters.dateRange.from) {
          const fromTime = new Date(advancedFilters.dateRange.from).getTime();
          if (createdAt < fromTime) return false;
        }
        if (advancedFilters.dateRange.to) {
          const toTime = new Date(advancedFilters.dateRange.to).getTime();
          if (createdAt > toTime) return false;
        }
        return true;
      })();

      const matchesPrice = (() => {
        if (minPrice === null && maxPrice === null) {
          return true;
        }
        if (typeof item.price !== "number") {
          return false;
        }
        if (minPrice !== null && item.price < minPrice) {
          return false;
        }
        if (maxPrice !== null && item.price > maxPrice) {
          return false;
        }
        return true;
      })();

      return matchesSearch && matchesTags && matchesStatus && matchesBodyParts && matchesDate && matchesPrice;
    });
  }, [
    portfolioItems,
    debouncedSearch,
    selectedTags,
    advancedFilters,
    isChipMultiSelect,
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast({ message: "請選擇圖片檔案", type: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: "圖片檔案大小不能超過 5MB", type: "error" });
      return;
    }
    setFormData((prev) => ({ ...prev, image: file }));
  };

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.title.trim()) {
      setToast({ message: "請輸入作品標題", type: "error" });
      return;
    }
    if (!formData.image && !editingItem) {
      setToast({ message: "請選擇圖片", type: "error" });
      return;
    }

    try {
      setUploading(true);
      const submitData = new FormData();
      submitData.append("title", formData.title);
      submitData.append("description", formData.description);
      submitData.append("tags", JSON.stringify(formData.tags));
      if (formData.image) {
        submitData.append("image", formData.image);
      }

      if (editingItem) {
        await postFormDataWithAuth(`/artist/portfolio/${editingItem.id}`, submitData);
      } else {
        await postFormDataWithAuth("/artist/portfolio", submitData);
      }

      setFormData({ title: "", description: "", tags: [], image: null });
      setShowUploadForm(false);
      setEditingItem(null);
      setToast({ message: "作品已儲存", type: "success" });
      fetchPortfolio();
    } catch (err) {
      console.error("Upload error:", err);
      setToast({ message: "上傳失敗", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description ?? "",
      tags: item.tags,
      image: null,
    });
    setShowUploadForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteRequest = (item: PortfolioItem) => {
    setPendingDelete({ type: "single", item });
    setDeleteInput("");
    setDeleteError(null);
  };

  const handleBulkDeleteRequest = () => {
    if (selectedIds.size === 0) return;
    const firstItem = portfolioItems.find((item) => selectedIds.has(item.id));
    if (!firstItem) return;
    setPendingDelete({
      type: "bulk",
      ids: Array.from(selectedIds),
      referenceTitle: firstItem.title,
    });
    setDeleteInput("");
    setDeleteError(null);
  };

  const handleCancelForm = () => {
    setFormData({ title: "", description: "", tags: [], image: null });
    setShowUploadForm(false);
    setEditingItem(null);
  };

  const handleSelectToggle = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleCopyLink = async (item: PortfolioItem) => {
    try {
      const url = item.imageUrl;
      await navigator.clipboard.writeText(url);
      setToast({ message: "作品連結已複製", type: "success" });
    } catch (err) {
      console.error("Copy link error:", err);
      setToast({ message: "無法複製連結", type: "error" });
    }
  };

  const resetFilters = () => {
    setAdvancedFilters(createInitialFilters());
    setDraftFilters(createInitialFilters());
  };

  const applyDraftFilters = () => {
    setAdvancedFilters({
      dateRange: { ...draftFilters.dateRange },
      priceRange: { ...draftFilters.priceRange },
      statuses: [...draftFilters.statuses],
      bodyParts: [...draftFilters.bodyParts],
    });
    setIsDrawerOpen(false);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const reference = pendingDelete.type === "single"
      ? pendingDelete.item.title
      : pendingDelete.referenceTitle;
    const required = reference.slice(0, 3).toLowerCase();
    if (deleteInput.trim().toLowerCase() !== required) {
      setDeleteError(`請輸入「${reference.slice(0, 3)}」以確認`);
      return;
    }

    try {
      setDeleting(true);
      if (pendingDelete.type === "single") {
        await deleteJsonWithAuth(`/artist/portfolio/${pendingDelete.item.id}`);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(pendingDelete.item.id);
          return next;
        });
      } else {
        await Promise.all(
          pendingDelete.ids.map((id) => deleteJsonWithAuth(`/artist/portfolio/${id}`))
        );
        setSelectedIds(new Set());
      }
      setToast({ message: "作品已刪除", type: "success" });
      setPendingDelete(null);
      setDeleteInput("");
      fetchPortfolio();
    } catch (err) {
      console.error("Delete error:", err);
      setToast({ message: "刪除失敗", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const chips = AVAILABLE_TAGS.map((tag) => ({
    id: tag,
    label: tag,
    active: selectedTags.includes(tag),
    onClick: () => {
      setSelectedTags((prev) => {
        if (isChipMultiSelect) {
          return prev.includes(tag)
            ? prev.filter((t) => t !== tag)
            : [...prev, tag];
        }
        if (prev.includes(tag)) {
          return [];
        }
        return [tag];
      });
    },
  }));

  const handleImportExport = () => {
    setToast({ message: "匯入 / 匯出功能開發中", type: "success" });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <TopBar onCreate={() => setShowUploadForm(true)} onImportExport={handleImportExport} />

      {toast && (
        <div className="fixed right-4 top-24 z-50 max-w-xs rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <p className={toast.type === "success" ? "text-[var(--text)]" : "text-red-400"}>{toast.message}</p>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Toolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            onClearSearch={() => setSearchInput("")}
            chips={chips}
            onMoreFilters={() => {
              setDraftFilters({
                dateRange: { ...advancedFilters.dateRange },
                priceRange: { ...advancedFilters.priceRange },
                statuses: [...advancedFilters.statuses],
                bodyParts: [...advancedFilters.bodyParts],
              });
              setIsDrawerOpen(true);
            }}
            activeFiltersCount={activeFiltersCount}
            isMultiSelect={isChipMultiSelect}
            onToggleSelectionMode={() => setIsChipMultiSelect((prev) => !prev)}
          />

          {showUploadForm && (
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_8px_24px_rgba(0,0,0,.35)]">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand)]/70">{editingItem ? "Edit" : "Create"}</p>
                  <h2 className="text-xl font-semibold text-[var(--text)]">{editingItem ? "編輯作品" : "新增作品"}</h2>
                </div>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text)]/80 transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
                  aria-label="關閉表單"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-5">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[var(--text)]">作品標題 *</span>
                      <Input
                        value={formData.title}
                        onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="輸入作品標題"
                        className="h-11 rounded-xl border border-[var(--line)] bg-[#0F1216] text-sm text-[var(--text)] placeholder:text-[var(--muted)]/70 focus-visible:ring-[var(--accent)]"
                        required
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[var(--text)]">作品描述</span>
                      <Textarea
                        value={formData.description}
                        onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                        placeholder="描述這個作品的特點、靈感來源等..."
                        rows={4}
                        className="rounded-xl border border-[var(--line)] bg-[#0F1216] text-sm text-[var(--text)] placeholder:text-[var(--muted)]/70 focus-visible:ring-[var(--accent)]"
                      />
                    </label>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--text)]">標籤</span>
                        <span className="text-xs text-[var(--muted)]">已選 {formData.tags.length} 項</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_TAGS.map((tag) => (
                          <Chip
                            key={tag}
                            active={formData.tags.includes(tag)}
                            onClick={() => handleTagToggle(tag)}
                          >
                            {tag}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-sm font-medium text-[var(--text)]">{editingItem ? "更換圖片" : "上傳圖片 *"}</span>
                    <label className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[var(--line)] bg-[#0F1216] px-6 py-10 text-center transition hover:border-[var(--accent)]/40">
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      {formData.image ? (
                        <>
                          <ImageIcon className="h-12 w-12 text-[var(--muted)]" />
                          <div className="space-y-1 text-sm">
                            <p className="text-[var(--text)]">{formData.image.name}</p>
                            <p className="text-[var(--muted)]/70">檔案大小 {(formData.image.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Camera className="h-12 w-12 text-[var(--muted)]" />
                          <p className="text-sm text-[var(--muted)]">點擊選擇圖片或拖放到這裡</p>
                          <p className="text-xs text-[var(--muted)]/70">支援 JPG、PNG，最大 5MB</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="h-11 rounded-xl border border-[var(--line)] px-6 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-6 text-sm font-semibold text-black shadow-md transition hover:brightness-110"
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingItem ? "更新作品" : "上傳作品"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {error && !loading ? (
            <section className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-12 text-center text-red-200">
              <p className="text-lg font-semibold">{error}</p>
              <button
                type="button"
                onClick={fetchPortfolio}
                className="mt-4 inline-flex items-center justify-center rounded-xl border border-red-300/40 px-5 py-2 text-sm font-medium text-red-100 transition hover:border-red-200"
              >
                重新載入
              </button>
            </section>
          ) : null}

          {!error && (
            <div className="space-y-4">
              {selectedIds.size > 0 && (
                <div className="hidden items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-3 text-sm text-[var(--muted)] shadow-[0_8px_24px_rgba(0,0,0,.35)] sm:flex">
                  <span className="text-[var(--text)]">已選 {selectedIds.size} 件作品</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                      className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm text-[var(--text)]/80 transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
                    >
                      回到頂部
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDeleteRequest}
                      className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-black shadow-md transition hover:brightness-110"
                    >
                      批次刪除
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <WorkCardSkeleton key={index} />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <EmptyState onCreate={() => setShowUploadForm(true)} />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredItems.map((item) => (
                    <WorkCard
                      key={item.id}
                      item={item}
                      selectable
                      selected={selectedIds.has(item.id)}
                      onSelectToggle={(checked) => handleSelectToggle(item.id, checked)}
                      onEdit={() => handleEdit(item)}
                      onDelete={() => handleDeleteRequest(item)}
                      onCopyLink={() => handleCopyLink(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <FloatingActions
        selectedCount={selectedIds.size}
        onBulkDelete={handleBulkDeleteRequest}
        onScrollTop={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />

      <FilterDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        draftFilters={draftFilters}
        onDraftChange={setDraftFilters}
        onReset={resetFilters}
        onApply={applyDraftFilters}
        availableBodyParts={availableBodyParts}
      />

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="max-w-md border border-[var(--line)] bg-[var(--panel)] text-[var(--text)]">
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription className="text-[var(--muted)]">
              為了避免誤刪，請輸入作品標題的前三個字母以確認。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {pendingDelete?.type === "single" ? (
              <p className="text-sm text-[var(--muted)]">
                {`作品：「${pendingDelete.item.title}」將被刪除。`}
              </p>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                {`將刪除 ${pendingDelete?.ids.length ?? 0} 件作品，請輸入第一筆作品「${pendingDelete?.referenceTitle ?? ""}」的前三個字母。`}
              </p>
            )}
            <Input
              value={deleteInput}
              onChange={(event) => {
                setDeleteInput(event.target.value);
                setDeleteError(null);
              }}
              className="h-11 rounded-xl border border-[var(--line)] bg-[#0F1216] text-sm text-[var(--text)] focus-visible:ring-[var(--accent)]"
              placeholder={pendingDelete ? pendingDelete.type === "single" ? pendingDelete.item.title.slice(0, 3) : pendingDelete.referenceTitle.slice(0, 3) : ""}
            />
            {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              確認刪除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
