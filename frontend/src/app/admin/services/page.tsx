"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, deleteJsonWithAuth, postJsonWithAuth, putJsonWithAuth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Plus, Edit, Trash2, ArrowLeft } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMin: number;
  currency: string;
  category: string | null;
  imageUrl: string | null;
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
        <Card className="mb-8">
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
                  圖片 URL
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                  placeholder="https://example.com/image.jpg"
                />
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
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditService(service)}
                          className="flex items-center space-x-1 action-btn-edit"
                        >
                          <Edit className="h-3 w-3" />
                          <span>編輯</span>
                        </Button>
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
    </div>
  );
}