"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, deleteJsonWithAuth, postJsonWithAuth, putJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";
import { getUniqueBranches, sortBranchesByName } from "@/lib/branch-utils";
import { Branch } from "@/types/branch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Plus, Edit, Trash2, ArrowLeft } from "lucide-react";

interface Artist {
  id: string;
  speciality?: string;
  portfolioUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}


export default function AdminArtistsPage() {
  const router = useRouter();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    branchId: '',
    speciality: '',
    portfolioUrl: '',
    active: true,
  });

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    fetchArtists();
    fetchBranches();
  }, [router]);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth<Artist[]>('/admin/artists');
      setArtists(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "載入刺青師資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const data = await getJsonWithAuth<Branch[]>('/admin/artists/branches');
      const uniqueBranches = sortBranchesByName(getUniqueBranches(data));
      setBranches(uniqueBranches);
    } catch (err) {
      const apiErr = err as ApiError;
      console.error('載入分店資料失敗:', apiErr.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      branchId: '',
      speciality: '',
      portfolioUrl: '',
      active: true,
    });
    setEditingArtist(null);
    setShowCreateForm(false);
  };

  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newArtist = await postJsonWithAuth('/admin/artists', formData) as Artist;
      setArtists([...artists, newArtist]);
      resetForm();
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "新增刺青師失敗");
    }
  };

      const handleEditArtist = (artist: Artist) => {
        setEditingArtist(artist);
        setFormData({
          name: artist.user?.name || '',
          email: artist.user?.email || '',
          password: '', // 編輯時不預填密碼
          branchId: artist.branch?.id || '',
          speciality: artist.speciality || '',
          portfolioUrl: artist.portfolioUrl || '',
          active: artist.active,
        });
        setShowCreateForm(true);
      };

  const handleUpdateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArtist) return;

    try {
      console.log('🔧 發送更新請求:', formData);
      const updatedArtist = await patchJsonWithAuth(`/admin/artists/${editingArtist.id}`, formData) as Artist;
      console.log('✅ 收到更新回應:', updatedArtist);
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
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center text-3xl font-bold text-gray-900 dark:text-white">
              <UserCheck className="mr-3 h-8 w-8" />
              管理刺青師
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              管理系統中的刺青師資料
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex w-full items-center justify-center space-x-2 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span>新增刺青師</span>
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
              {artists.filter(artist => artist.active).length}
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
              {artists.filter(artist => !artist.active).length}
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
              
              {!editingArtist && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    密碼 *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="請輸入密碼（至少8個字符）"
                    minLength={8}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  所屬分店 {!editingArtist ? '*' : ''}
                </label>
                <select
                  required={!editingArtist}
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={!!(editingArtist && branches.length === 1)} // 如果只有一個分店且是編輯模式，禁用選擇
                >
                  <option value="">請選擇分店</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                {editingArtist && branches.length === 1 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    分店經理只能管理自己分店的刺青師
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    專長
                  </label>
                  <input
                    type="text"
                    value={formData.speciality}
                    onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="例如：傳統刺青、寫實風格、水彩風格等"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    作品集連結
                  </label>
                  <input
                    type="url"
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="https://example.com/portfolio"
                  />
                </div>
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    啟用狀態
                  </span>
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
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">所屬分店</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">專長</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">作品集</th>
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
                            {artist.user?.name || '未設定'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {artist.user?.email || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {artist.branch?.name || '未分配'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {artist.speciality || '未設定'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {artist.portfolioUrl ? (
                            <a 
                              href={artist.portfolioUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              查看作品集
                            </a>
                          ) : (
                            '未設定'
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            artist.active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {artist.active ? '啟用' : '停用'}
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
