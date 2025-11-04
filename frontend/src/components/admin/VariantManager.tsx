"use client";

import { useState, useEffect } from "react";
import { X, Save, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiBase, getAccessToken } from "@/lib/api";

interface ServiceVariant {
  id: string;
  type: string;
  name: string;
  code?: string;
  description?: string;
  priceModifier: number;
  durationModifier: number;
  sortOrder: number;
  isActive: boolean;
  isRequired: boolean;
}

interface GroupedVariants {
  size: ServiceVariant[];
  color: ServiceVariant[];
  position: ServiceVariant[];
  design_fee: ServiceVariant[];
  style: ServiceVariant[];
  complexity: ServiceVariant[];
}

interface VariantManagerProps {
  serviceId: string;
  serviceName: string;
  onClose: () => void;
  onUpdate: () => void;
}

const VARIANT_TYPE_LABELS: Record<string, string> = {
  size: "尺寸",
  color: "顏色",
  position: "部位",
  design_fee: "設計費",
  style: "風格",
  complexity: "複雜度",
};

export function VariantManager({ serviceId, serviceName, onClose, onUpdate }: VariantManagerProps) {
  const [variants, setVariants] = useState<GroupedVariants>({
    size: [],
    color: [],
    position: [],
    design_fee: [],
    style: [],
    complexity: [],
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<ServiceVariant | null>(null);
  const [editForm, setEditForm] = useState({
    priceModifier: 0,
    durationModifier: 0,
  });

  useEffect(() => {
    fetchVariants();
  }, [serviceId]);

  const fetchVariants = async () => {
    try {
      const response = await fetch(`${getApiBase()}/admin/service-variants/service/${serviceId}`, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVariants(data);
      }
    } catch (error) {
      console.error("獲取規格失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  // 切換啟用/停用
  const toggleActive = async (variantId: string, currentActive: boolean) => {
    setUpdating(variantId);
    try {
      const response = await fetch(`${getApiBase()}/admin/service-variants/${variantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (response.ok) {
        await fetchVariants();
        onUpdate();
      }
    } catch (error) {
      alert("更新失敗，請重試");
    } finally {
      setUpdating(null);
    }
  };

  // 開始編輯
  const startEdit = (variant: ServiceVariant) => {
    setEditingVariant(variant);
    setEditForm({
      priceModifier: variant.priceModifier,
      durationModifier: variant.durationModifier,
    });
  };

  // 保存編輯
  const saveEdit = async () => {
    if (!editingVariant) return;

    setUpdating(editingVariant.id);
    try {
      const response = await fetch(`${getApiBase()}/admin/service-variants/${editingVariant.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        await fetchVariants();
        setEditingVariant(null);
        onUpdate();
      }
    } catch (error) {
      alert("更新失敗，請重試");
    } finally {
      setUpdating(null);
    }
  };

  // 刪除規格
  const deleteVariant = async (variantId: string, variantName: string) => {
    if (!confirm(`確定要刪除規格「${variantName}」嗎？\n\n注意：顧客將無法再選擇此規格。`)) {
      return;
    }

    setUpdating(variantId);
    try {
      const response = await fetch(`${getApiBase()}/admin/service-variants/${variantId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });

      if (response.ok) {
        await fetchVariants();
        onUpdate();
      }
    } catch (error) {
      alert("刪除失敗，請重試");
    } finally {
      setUpdating(null);
    }
  };

  const renderVariantGroup = (type: keyof GroupedVariants, variantList: ServiceVariant[]) => {
    if (variantList.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          {VARIANT_TYPE_LABELS[type]}
          <Badge variant="outline">{variantList.length} 個</Badge>
        </h3>
        <div className="space-y-2">
          {variantList.map((variant) => (
            <div
              key={variant.id}
              className={`border rounded-lg p-4 ${
                variant.isActive ? "bg-white" : "bg-gray-50"
              } ${editingVariant?.id === variant.id ? "ring-2 ring-blue-500" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{variant.name}</span>
                    {variant.code && (
                      <Badge variant="secondary" className="text-xs">
                        {variant.code}
                      </Badge>
                    )}
                    {variant.isRequired && (
                      <Badge className="bg-red-100 text-red-700 text-xs">必選</Badge>
                    )}
                  </div>

                  {editingVariant?.id === variant.id ? (
                    // 編輯模式
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <Label className="text-xs text-gray-600">價格調整（元）</Label>
                        <Input
                          type="number"
                          value={editForm.priceModifier}
                          onChange={(e) =>
                            setEditForm({ ...editForm, priceModifier: Number(e.target.value) })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">時長調整（分鐘）</Label>
                        <Input
                          type="number"
                          value={editForm.durationModifier}
                          onChange={(e) =>
                            setEditForm({ ...editForm, durationModifier: Number(e.target.value) })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ) : (
                    // 顯示模式
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>價格：{variant.priceModifier > 0 ? `+${variant.priceModifier}` : variant.priceModifier}元</span>
                      <span>時長：{variant.durationModifier > 0 ? `+${variant.durationModifier}` : variant.durationModifier}分</span>
                    </div>
                  )}

                  {variant.description && (
                    <p className="text-xs text-gray-500 mt-1">{variant.description}</p>
                  )}
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2 ml-4">
                  {editingVariant?.id === variant.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={updating === variant.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        保存
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingVariant(null)}
                      >
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(variant.id, variant.isActive)}
                        disabled={updating === variant.id}
                        className={variant.isActive ? "text-gray-600" : "text-green-600"}
                      >
                        {updating === variant.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                        ) : variant.isActive ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(variant)}
                      >
                        編輯
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteVariant(variant.id, variant.name)}
                        disabled={updating === variant.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-4xl rounded-2xl bg-white p-8 shadow-2xl">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <span className="ml-3 text-gray-600">載入規格資料...</span>
          </div>
        </div>
      </div>
    );
  }

  const totalVariants = Object.values(variants).reduce((sum, list) => sum + list.length, 0);
  const activeVariants = Object.values(variants)
    .flat()
    .filter((v) => v.isActive).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">規格管理</h2>
            <p className="mt-1 text-sm text-gray-500">
              {serviceName} - 共 {totalVariants} 個規格（{activeVariants} 個啟用）
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            aria-label="關閉"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* 說明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">💡 規格管理說明</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 切換開關可以啟用/停用規格（停用後顧客將看不到此選項）</li>
              <li>• 點擊「編輯」可以修改價格和時長</li>
              <li>• 價格調整：尺寸的價格是完整價格（已包含黑白），彩色通常 +1000 元</li>
              <li>• 刪除規格後無法復原，請謹慎操作</li>
            </ul>
          </div>

          {/* 規格列表 */}
          <div className="space-y-6">
            {(Object.keys(variants) as Array<keyof GroupedVariants>).map((type) =>
              renderVariantGroup(type, variants[type])
            )}
          </div>

          {/* 無規格提示 */}
          {totalVariants === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">此服務尚未設定任何規格</p>
              <p className="text-sm text-gray-400">
                請先初始化規格，或手動添加規格
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-white px-6 py-4">
          <Button onClick={onClose} className="w-full" variant="outline">
            關閉
          </Button>
        </div>
      </div>
    </div>
  );
}

