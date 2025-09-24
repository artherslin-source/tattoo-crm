"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, deleteJsonWithAuth, postJsonWithAuth, putJsonWithAuth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Plus, Edit, Trash2, ArrowLeft } from "lucide-react";

interface TattooArtist {
  id: string;
  name: string;
  email: string;
  stylePreferences: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function AdminArtistsPage() {
  const router = useRouter();
  const [artists, setArtists] = useState<TattooArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingArtist, setEditingArtist] = useState<TattooArtist | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    stylePreferences: '',
    isActive: true
  });

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    fetchArtists();
  }, [router]);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth('/admin/artists');
      setArtists(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "載入刺青師資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      stylePreferences: '',
      isActive: true
    });
    setEditingArtist(null);
    setShowCreateForm(false);
  };

  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newArtist = await postJsonWithAuth('/admin/artists', formData);
      setArtists([...artists, newArtist]);
      resetForm();
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "新增刺青師失敗");
    }
  };

  const handleEditArtist = (artist: TattooArtist) => {
    setEditingArtist(artist);
    setFormData({
      name: artist.name,
      email: artist.email,
      stylePreferences: artist.stylePreferences || '',
      isActive: artist.isActive
    });
    setShowCreateForm(true);
  };

  const handleUpdateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArtist) return;

    try {
      const updatedArtist = await putJsonWithAuth(`/admin/artists/${editingArtist.id}`, formData);
      setArtists(artists.map(artist => 
        artist.id === editingArtist.id ? updatedArtist : artist
      ));
      resetForm();
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "更新刺青師失敗");
    }
  };

  const handleDeleteArtist = async (artistId: string) => {
    if (!confirm('確定要刪除這個刺青師嗎？此操作無法復原。')) {
      return;
    }

    try {
      await deleteJsonWithAuth(`/admin/artists/${artistId}`);
      setArtists(artists.filter(artist => artist.id !== artistId));
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "刪除刺青師失敗");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">載入刺青師資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <UserCheck className="mr-3 h-8 w-8" />
              管理刺青師
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              管理系統中的刺青師資料
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>新增刺青師</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="flex items-center space-x-2"
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

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總刺青師數</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{artists.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活躍刺青師</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {artists.filter(artist => artist.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">停用刺青師</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {artists.filter(artist => !artist.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {editingArtist ? '編輯刺青師' : '新增刺青師'}
            </CardTitle>
            <CardDescription>
              {editingArtist ? '更新刺青師資訊' : '新增一位新的刺青師'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingArtist ? handleUpdateArtist : handleCreateArtist} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    姓名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  專長風格
                </label>
                <textarea
                  value={formData.stylePreferences}
                  onChange={(e) => setFormData({ ...formData, stylePreferences: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="例如：傳統刺青、寫實風格、水彩風格等"
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
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  啟用狀態
                </label>
              </div>

              <div className="flex space-x-2">
                <Button type="submit">
                  {editingArtist ? '更新刺青師' : '新增刺青師'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Artists Table */}
      <Card>
        <CardHeader>
          <CardTitle>刺青師列表</CardTitle>
          <CardDescription>
            管理系統中的所有刺青師
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">姓名</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">專長風格</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">狀態</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">建立時間</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">操作</th>
                </tr>
              </thead>
              <tbody>
                {artists.map((artist) => (
                  <tr key={artist.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {artist.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {artist.email}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {artist.stylePreferences || '未設定'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        artist.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {artist.isActive ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {new Date(artist.createdAt).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditArtist(artist)}
                          className="flex items-center space-x-1"
                        >
                          <Edit className="h-3 w-3" />
                          <span>編輯</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteArtist(artist.id)}
                          className="flex items-center space-x-1 text-red-600 hover:text-red-700"
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
          
          {artists.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              目前沒有刺青師資料
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
