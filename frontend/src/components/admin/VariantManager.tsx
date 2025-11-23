"use client";

import { useState, useEffect } from "react";
import { X, Save, Trash2, ToggleLeft, ToggleRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getApiBase, getAccessToken } from "@/lib/api";

interface ServiceVariant {
  id: string;
  type: string;
  name: string;
  code?: string;
  description?: string;
  priceModifier: number;
  sortOrder: number;
  isActive: boolean;
  isRequired: boolean;
}

interface GroupedVariants {
  size: ServiceVariant[];
  color: ServiceVariant[];
  position: ServiceVariant[];
  side: ServiceVariant[];
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
  side: "左右半邊",
  design_fee: "設計費",
  style: "風格",
  complexity: "複雜度",
};

// 預定義的規格模板
const PREDEFINED_VARIANTS: Record<string, Array<{
  name: string;
  code?: string;
  description?: string;
  priceModifier: number;
  sortOrder: number;
  isRequired?: boolean;
}>> = {
  size: [
    { name: '5-6cm', code: 'S1', priceModifier: 2000, sortOrder: 1, isRequired: true, description: '5-6cm（黑白2000/彩色3000）' },
    { name: '6-7cm', code: 'S2', priceModifier: 3000, sortOrder: 2, isRequired: true, description: '6-7cm（黑白3000/彩色4000）' },
    { name: '7-8cm', code: 'S3', priceModifier: 4000, sortOrder: 3, isRequired: true, description: '7-8cm（黑白4000/彩色5000）' },
    { name: '8-9cm', code: 'S4', priceModifier: 5000, sortOrder: 4, isRequired: true, description: '8-9cm（黑白5000/彩色6000）' },
    { name: '9-10cm', code: 'S5', priceModifier: 6000, sortOrder: 5, isRequired: true, description: '9-10cm（黑白6000/彩色7000）' },
    { name: '10-11cm', code: 'S6', priceModifier: 7000, sortOrder: 6, isRequired: true, description: '10-11cm（黑白7000/彩色8000）' },
    { name: '11-12cm', code: 'S7', priceModifier: 8000, sortOrder: 7, isRequired: true, description: '11-12cm（黑白8000/彩色9000）' },
    { name: '12-13cm', code: 'S8', priceModifier: 9000, sortOrder: 8, isRequired: true, description: '12-13cm（黑白9000/彩色10000）' },
    { name: '13-14cm', code: 'S9', priceModifier: 10000, sortOrder: 9, isRequired: true, description: '13-14cm（黑白10000/彩色11000）' },
    { name: '14-15cm', code: 'S10', priceModifier: 11000, sortOrder: 10, isRequired: true, description: '14-15cm（黑白11000/彩色12000）' },
    { name: '15-16cm', code: 'S11', priceModifier: 12000, sortOrder: 11, isRequired: true, description: '15-16cm（黑白12000/彩色13000）' },
    { name: '16-17cm', code: 'S12', priceModifier: 14000, sortOrder: 12, isRequired: true, description: '16-17cm（黑白14000/彩色14000）' },
  ],
  color: [
    { name: '黑白', code: 'BW', priceModifier: 0, sortOrder: 1, isRequired: true, description: '黑白陰影' },
    { name: '彩色', code: 'COLOR', priceModifier: 1000, sortOrder: 2, isRequired: true, description: '彩色上色（大部分尺寸+1000）' },
    { name: '全彩', code: 'FULL_COLOR', priceModifier: 1000, sortOrder: 3, isRequired: false, description: '全彩色漸層' },
  ],
  position: [
    { name: '手臂外側', code: 'P1', priceModifier: 0, sortOrder: 1, isRequired: false, description: '手臂外側面' },
    { name: '手臂內側', code: 'P2', priceModifier: 200, sortOrder: 2, isRequired: false, description: '手臂內側面' },
    { name: '小腿', code: 'P3', priceModifier: 0, sortOrder: 3, isRequired: false, description: '小腿部位' },
    { name: '大腿', code: 'P4', priceModifier: 500, sortOrder: 4, isRequired: false, description: '大腿部位' },
    { name: '背部', code: 'P5', priceModifier: 1000, sortOrder: 5, isRequired: false, description: '背部區域' },
    { name: '胸部', code: 'P6', priceModifier: 800, sortOrder: 6, isRequired: false, description: '胸部區域' },
  ],
  side: [
    { name: '左半邊', code: 'LEFT', priceModifier: 0, sortOrder: 1, isRequired: false, description: '左側' },
    { name: '右半邊', code: 'RIGHT', priceModifier: 0, sortOrder: 2, isRequired: false, description: '右側' },
  ],
  design_fee: [
    { name: '設計費', code: 'DESIGN', priceModifier: 0, sortOrder: 1, isRequired: false, description: '另外估價（需管理後台輸入）' },
  ],
  style: [
    { name: '傳統', code: 'S1', priceModifier: 0, sortOrder: 1, isRequired: false, description: '經典傳統刺青風格' },
    { name: '寫實', code: 'S2', priceModifier: 1500, sortOrder: 2, isRequired: false, description: '超寫實風格' },
    { name: '圖騰', code: 'S3', priceModifier: 500, sortOrder: 3, isRequired: false, description: '部落圖騰' },
    { name: '日式', code: 'S4', priceModifier: 1000, sortOrder: 4, isRequired: false, description: '日本傳統' },
    { name: '極簡', code: 'S5', priceModifier: 800, sortOrder: 5, isRequired: false, description: '極簡線條' },
  ],
  complexity: [
    { name: '簡單', code: 'C1', priceModifier: 0, sortOrder: 1, isRequired: false, description: '簡單線條' },
    { name: '中等', code: 'C2', priceModifier: 1000, sortOrder: 2, isRequired: false, description: '中等複雜度' },
    { name: '複雜', code: 'C3', priceModifier: 2500, sortOrder: 3, isRequired: false, description: '高複雜度' },
  ],
};

export function VariantManager({ serviceId, serviceName, onClose, onUpdate }: VariantManagerProps) {
  const [variants, setVariants] = useState<GroupedVariants>({
    size: [],
    color: [],
    position: [],
    side: [],
    design_fee: [],
    style: [],
    complexity: [],
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<ServiceVariant | null>(null);
  const [editForm, setEditForm] = useState({
    priceModifier: 0,
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedVariantType, setSelectedVariantType] = useState<string>("");
  const [selectedVariantTemplate, setSelectedVariantTemplate] = useState<string>("");
  const [adding, setAdding] = useState(false);

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
    console.log(`[VariantManager] 切換規格: ${variantId}, 當前狀態: ${currentActive}, 目標狀態: ${!currentActive}`);
    setUpdating(variantId);
    try {
      const url = `${getApiBase()}/admin/service-variants/${variantId}`;
      const newStatus = !currentActive;
      console.log(`[VariantManager] API URL: ${url}`);
      console.log(`[VariantManager] 發送數據:`, { isActive: newStatus });
      
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      console.log(`[VariantManager] 響應狀態: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`[VariantManager] 更新成功:`, data);
        await fetchVariants();
        onUpdate();
      } else {
        const errorData = await response.text();
        console.error(`[VariantManager] 更新失敗:`, errorData);
        alert(`更新失敗: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("[VariantManager] 切換規格時發生錯誤:", error);
      alert("更新失敗，請重試。請檢查網路連接或查看控制台錯誤。");
    } finally {
      setUpdating(null);
    }
  };

  // 開始編輯
  const startEdit = (variant: ServiceVariant) => {
    setEditingVariant(variant);
    setEditForm({
      priceModifier: variant.priceModifier,
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

  // 新增規格
  const handleAddVariant = async () => {
    if (!selectedVariantType || !selectedVariantTemplate) {
      alert("請選擇規格類型和具體規格");
      return;
    }

    const template = PREDEFINED_VARIANTS[selectedVariantType]?.find(
      (v) => v.name === selectedVariantTemplate
    );

    if (!template) {
      alert("找不到選中的規格模板");
      return;
    }

    // 檢查是否已經存在相同名稱的規格
    const existingVariants = variants[selectedVariantType as keyof GroupedVariants] || [];
    const exists = existingVariants.some((v) => v.name === template.name);
    if (exists) {
      alert(`規格「${template.name}」已經存在，請勿重複添加`);
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`${getApiBase()}/admin/service-variants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({
          serviceId,
          type: selectedVariantType,
          name: template.name,
          code: template.code,
          description: template.description,
          priceModifier: template.priceModifier,
          sortOrder: template.sortOrder,
          isRequired: template.isRequired || false,
        }),
      });

      if (response.ok) {
        await fetchVariants();
        onUpdate();
        setShowAddDialog(false);
        setSelectedVariantType("");
        setSelectedVariantTemplate("");
        alert("規格添加成功！");
      } else {
        const errorData = await response.text();
        console.error("添加規格失敗:", errorData);
        alert(`添加規格失敗: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("添加規格時發生錯誤:", error);
      alert("添加規格失敗，請重試");
    } finally {
      setAdding(false);
    }
  };

  const renderVariantGroup = (type: keyof GroupedVariants, variantList: ServiceVariant[]) => {
    if (variantList.length === 0) return null;

    // 分離啟用和停用的規格
    const activeVariants = variantList.filter((v) => v.isActive);
    const inactiveVariants = variantList.filter((v) => !v.isActive);

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          {VARIANT_TYPE_LABELS[type]}
          <Badge variant="outline">
            {variantList.length} 個（{activeVariants.length} 啟用，{inactiveVariants.length} 停用）
          </Badge>
        </h3>
        
        {/* 啟用的規格 */}
        {activeVariants.length > 0 && (
          <div className="space-y-2 mb-4">
            {activeVariants.map((variant) => (
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
                    {/* 狀態顯示 */}
                    <Badge
                      className={
                        variant.isActive
                          ? "bg-green-100 text-green-700 border border-green-300 text-xs"
                          : "bg-gray-200 text-gray-600 border border-gray-400 text-xs"
                      }
                    >
                      {variant.isActive ? "✓ 啟用中" : "✗ 已停用"}
                    </Badge>
                  </div>

                  {editingVariant?.id === variant.id ? (
                    // 編輯模式
                    <div className="mt-3">
                      <Label className="text-xs text-gray-600">價格調整（元）</Label>
                      <Input
                        type="number"
                        value={editForm.priceModifier}
                        onChange={(e) =>
                          setEditForm({ ...editForm, priceModifier: Number(e.target.value) })
                        }
                        className="mt-1 w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {variant.type === 'size' ? '尺寸的價格是完整價格（包含黑白）' : 
                         variant.type === 'color' && variant.name === '彩色' ? '彩色通常加價 1000 元' : 
                         '0 表示不加價'}
                      </p>
                    </div>
                  ) : (
                    // 顯示模式
                    <div className="text-sm text-gray-600">
                      <span>價格：{variant.priceModifier > 0 ? `+${variant.priceModifier}` : variant.priceModifier}元</span>
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
                        className={
                          updating === variant.id
                            ? "border-gray-300 bg-gray-50"
                            : variant.isActive
                            ? "bg-green-100 text-green-700 border-green-400 hover:bg-green-200 font-semibold"
                            : "bg-gray-200 text-gray-600 border-gray-400 hover:bg-gray-300 font-semibold"
                        }
                        title={variant.isActive ? "點擊停用此規格" : "點擊啟用此規格"}
                      >
                        {updating === variant.id ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent mr-1"></div>
                            <span className="text-xs">更新中...</span>
                          </>
                        ) : variant.isActive ? (
                          <>
                            <ToggleRight className="h-4 w-4 mr-1" />
                            <span className="text-xs font-bold">已啟用</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-1" />
                            <span className="text-xs font-bold">已停用</span>
                          </>
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
        )}

        {/* 停用的規格 */}
        {inactiveVariants.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="h-px bg-gray-300 flex-1"></div>
              <span className="text-xs text-gray-500 font-medium">已停用的規格（可點擊重新啟用）</span>
              <div className="h-px bg-gray-300 flex-1"></div>
            </div>
            <div className="space-y-2">
              {inactiveVariants.map((variant) => (
                <div
                  key={variant.id}
                  className={`border border-gray-300 rounded-lg p-4 bg-gray-50 ${
                    editingVariant?.id === variant.id ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-600">{variant.name}</span>
                        {variant.code && (
                          <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">
                            {variant.code}
                          </Badge>
                        )}
                        {variant.isRequired && (
                          <Badge className="bg-red-100 text-red-700 text-xs">必選</Badge>
                        )}
                        {/* 狀態顯示 */}
                        <Badge className="bg-gray-300 text-gray-700 border border-gray-400 text-xs">
                          ✗ 已停用
                        </Badge>
                      </div>

                      {editingVariant?.id === variant.id ? (
                        // 編輯模式
                        <div className="mt-3">
                          <Label className="text-xs text-gray-600">價格調整（元）</Label>
                          <Input
                            type="number"
                            value={editForm.priceModifier}
                            onChange={(e) =>
                              setEditForm({ ...editForm, priceModifier: Number(e.target.value) })
                            }
                            className="mt-1 w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {variant.type === 'size' ? '尺寸的價格是完整價格（包含黑白）' : 
                             variant.type === 'color' && variant.name === '彩色' ? '彩色通常加價 1000 元' : 
                             '0 表示不加價'}
                          </p>
                        </div>
                      ) : (
                        // 顯示模式
                        <div className="text-sm text-gray-500">
                          <span>價格：{variant.priceModifier > 0 ? `+${variant.priceModifier}` : variant.priceModifier}元</span>
                        </div>
                      )}

                      {variant.description && (
                        <p className="text-xs text-gray-400 mt-1">{variant.description}</p>
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
                            className={
                              updating === variant.id
                                ? "border-gray-300 bg-gray-50"
                                : "bg-gray-200 text-gray-600 border-gray-400 hover:bg-gray-300 font-semibold"
                            }
                            title="點擊啟用此規格"
                          >
                            {updating === variant.id ? (
                              <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent mr-1"></div>
                                <span className="text-xs">更新中...</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4 w-4 mr-1" />
                                <span className="text-xs font-bold">已停用</span>
                              </>
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
        )}
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
              <li>• <strong>規格顯示：</strong>
                <ul className="ml-4 mt-1 space-y-0.5">
                  <li>- <strong>啟用的規格</strong>：顯示在上方（白色背景），顧客在前端可以看到</li>
                  <li>- <strong>停用的規格</strong>：顯示在下方灰色區域（灰色背景），顧客在前端看不到</li>
                  <li>- 停用的規格可以隨時重新啟用，點擊灰色「已停用」按鈕即可</li>
                </ul>
              </li>
              <li>• <strong>啟用/停用：</strong>
                <ul className="ml-4 mt-1 space-y-0.5">
                  <li>- 綠色「已啟用」按鈕：規格已啟用，**點擊後會停用**（顧客將看不到此選項）</li>
                  <li>- 灰色「已停用」按鈕：規格已停用，**點擊後會啟用**（顧客將看到此選項）</li>
                </ul>
              </li>
              <li>• <strong>編輯價格：</strong>點擊「編輯」可以修改價格調整</li>
              <li>• <strong>價格規則：</strong>尺寸價格是完整價格（已包含黑白），彩色通常 +1000 元</li>
              <li>• <strong>刪除規格：</strong>刪除後無法復原，請謹慎操作</li>
            </ul>
          </div>

          {/* 新增規格按鈕 */}
          <div className="mb-6 flex justify-end">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增規格
            </Button>
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

      {/* 新增規格對話框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增規格</DialogTitle>
            <DialogDescription>
              從預定義的規格模板中選擇並添加到服務中
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="variant-type">規格類型</Label>
              <Select
                value={selectedVariantType}
                onValueChange={(value) => {
                  setSelectedVariantType(value);
                  setSelectedVariantTemplate(""); // 重置選中的規格
                }}
              >
                <SelectTrigger id="variant-type" className="mt-1">
                  <SelectValue placeholder="請選擇規格類型" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(VARIANT_TYPE_LABELS).map((type) => (
                    <SelectItem key={type} value={type}>
                      {VARIANT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVariantType && (
              <div>
                <Label htmlFor="variant-template">具體規格</Label>
                <Select
                  value={selectedVariantTemplate}
                  onValueChange={setSelectedVariantTemplate}
                >
                  <SelectTrigger id="variant-template" className="mt-1">
                    <SelectValue placeholder="請選擇具體規格" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_VARIANTS[selectedVariantType]?.map((variant) => {
                      // 檢查是否已經存在
                      const existingVariants = variants[selectedVariantType as keyof GroupedVariants] || [];
                      const exists = existingVariants.some((v) => v.name === variant.name);
                      return (
                        <SelectItem
                          key={variant.name}
                          value={variant.name}
                          disabled={exists}
                        >
                          {variant.name}
                          {variant.description && ` - ${variant.description}`}
                          {variant.priceModifier !== 0 && ` (${variant.priceModifier > 0 ? '+' : ''}${variant.priceModifier}元)`}
                          {exists && " (已存在)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedVariantTemplate && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    {(() => {
                      const template = PREDEFINED_VARIANTS[selectedVariantType]?.find(
                        (v) => v.name === selectedVariantTemplate
                      );
                      return template ? (
                        <div className="text-sm space-y-1">
                          <div><strong>名稱：</strong>{template.name}</div>
                          {template.code && <div><strong>代碼：</strong>{template.code}</div>}
                          {template.description && <div><strong>說明：</strong>{template.description}</div>}
                          <div><strong>價格調整：</strong>{template.priceModifier > 0 ? `+${template.priceModifier}` : template.priceModifier}元</div>
                          {template.isRequired && <Badge className="mt-1">必選</Badge>}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setSelectedVariantType("");
                setSelectedVariantTemplate("");
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleAddVariant}
              disabled={!selectedVariantType || !selectedVariantTemplate || adding}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {adding ? "添加中..." : "確認添加"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

