"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, deleteJsonWithAuth, postJsonWithAuth, putJsonWithAuth, ApiError, getImageUrl, getApiBase } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Plus, Edit, Trash2, ArrowLeft, Image as ImageIcon, Package, CheckCircle, XCircle, Sliders } from "lucide-react";
import { ServiceImageSelector } from "@/components/admin/ServiceImageSelector";
import { VariantManager } from "@/components/admin/VariantManager";
import { Badge } from "@/components/ui/badge";

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

export default function AdminServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [initializingVariant, setInitializingVariant] = useState<string | null>(null);
  const [managingVariantService, setManagingVariantService] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    durationMin: '',
    currency: 'TWD',
    category: '',
    imageUrl: '',
    isActive: true
  });

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    fetchServices();
  }, [router]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth<Service[]>('/admin/services');
      setServices(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "載入服務資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      durationMin: '',
      currency: 'TWD',
      category: '',
      imageUrl: '',
      isActive: true
    });
    setEditingService(null);
    setShowCreateForm(false);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newService = await postJsonWithAuth('/admin/services', {
        ...formData,
        price: parseInt(formData.price),
        durationMin: parseInt(formData.durationMin)
      }) as Service;
      setServices([...services, newService]);
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
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      durationMin: service.durationMin.toString(),
      currency: service.currency,
      category: service.category || '',
      imageUrl: service.imageUrl || '',
      isActive: service.isActive
    });
    setShowCreateForm(true);
    
    // 自動滾動到編輯表單
    setTimeout(() => {
      const editForm = document.getElementById('edit-service-form');
      if (editForm) {
        editForm.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      const updatedService = await putJsonWithAuth(`/admin/services/${editingService.id}`, {
        ...formData,
        price: parseInt(formData.price),
        durationMin: parseInt(formData.durationMin)
      }) as Service;
      setServices(services.map(service => 
        service.id === editingService.id ? updatedService : service
      ));
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
      setServices(services.filter(service => service.id !== serviceId));
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "刪除服務失敗");
    }
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary-dark mb-2">
                    價格 (NT$) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary-dark mb-2">
                    時長 (分鐘) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.durationMin}
                    onChange={(e) => setFormData({ ...formData, durationMin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary-dark mb-2">
                    幣別
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                  >
                    <option value="TWD">TWD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
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
                  <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">價格</th>
                  <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">時長</th>
                  <th className="text-center py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">圖片</th>
                  <th className="text-center py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">規格</th>
                  <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">狀態</th>
                  <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">操作</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-text-primary-light dark:text-text-primary-dark">
                          {service.name}
                        </div>
                        {service.description && (
                          <div className="text-sm text-text-muted-light dark:text-text-muted-dark">
                            {service.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-muted-light dark:text-text-secondary-dark">
                      {service.category || '未分類'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-text-primary-light dark:text-text-primary-dark">
                        {service.currency} {service.price.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-muted-light dark:text-text-secondary-dark">
                      {service.durationMin} 分鐘
                    </td>
                    <td className="py-3 px-4 text-center">
                      {service.imageUrl ? (
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
                      {service.hasVariants ? (
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
                        service.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-600' 
                          : 'bg-gray-100 text-text-primary-light dark:bg-gray-900 dark:text-text-secondary-dark'
                      }`}>
                        {service.isActive ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-2">
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
                            onClick={() => setManagingVariantService({ id: service.id, name: service.name })}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {services.length === 0 && (
            <div className="text-center py-8 text-text-muted-light dark:text-text-muted-dark">
              目前沒有服務項目
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
          setFormData({ ...formData, imageUrl });
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