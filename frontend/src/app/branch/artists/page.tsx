"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAccessToken,
  getUserRole,
  getUserBranchId,
  getJsonWithAuth,
  deleteJsonWithAuth,
  postJsonWithAuth,
  patchJsonWithAuth,
  ApiError,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UserCheck,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Building2,
} from "lucide-react";

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

interface Branch {
  id: string;
  name: string;
  address: string;
  [key: string]: unknown;
}

export default function BranchArtistsPage() {
  const router = useRouter();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [branchInfo, setBranchInfo] = useState<Branch | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    branchId: "",
    speciality: "",
    portfolioUrl: "",
    active: true,
  });

  useEffect(() => {
    const token = getAccessToken();
    const role = getUserRole();
    const branchId = getUserBranchId();

    if (!token || role !== "BRANCH_MANAGER") {
      router.replace("/profile");
      return;
    }

    setUserBranchId(branchId);

    // 獲取分店資訊
    if (branchId) {
      getJsonWithAuth<Branch>(`/branches/${branchId}`)
        .then(setBranchInfo)
        .catch((err) => console.error("Failed to fetch branch info:", err));
    }

    fetchArtists();
  }, [router]);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth<Artist[]>("/admin/artists");
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
      name: "",
      email: "",
      password: "",
      branchId: userBranchId || "",
      speciality: "",
      portfolioUrl: "",
      active: true,
    });
    setShowCreateForm(false);
    setEditingArtist(null);
  };

  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postJsonWithAuth("/admin/artists", formData);
      resetForm();
      fetchArtists();
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "創建刺青師失敗");
    }
  };

  const handleEditArtist = (artist: Artist) => {
    setEditingArtist(artist);
    setFormData({
      name: artist.user.name,
      email: artist.user.email,
      password: "",
      branchId: artist.branch?.id || userBranchId || "",
      speciality: artist.speciality || "",
      portfolioUrl: artist.portfolioUrl || "",
      active: artist.active,
    });
    setShowCreateForm(true);
  };

  const handleUpdateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArtist) return;

    try {
      console.log("🔧 發送更新請求:", formData);
      const updatedArtist = (await patchJsonWithAuth(
        `/admin/artists/${editingArtist.id}`,
        formData,
      )) as Artist;
      console.log("✅ 收到更新回應:", updatedArtist);
      setArtists(
        artists.map((artist) =>
          artist.id === editingArtist.id ? updatedArtist : artist,
        ),
      );
      resetForm();
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "更新刺青師失敗");
    }
  };

  const handleDeleteArtist = async (id: string) => {
    if (!confirm("確定要刪除這個刺青師嗎？")) return;

    try {
      await deleteJsonWithAuth(`/admin/artists/${id}`);
      setArtists(artists.filter((artist) => artist.id !== id));
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
          <p className="text-text-muted-light dark:text-text-muted-dark">
            載入中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
              分店刺青師管理
            </h1>
          </div>
          {branchInfo && (
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <Building2 className="h-4 w-4 mr-1" />
                {branchInfo.name}
              </span>
            </div>
          )}
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            管理您分店的刺青師資訊
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>回上一頁</span>
          </Button>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增刺青師
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingArtist ? "編輯刺青師" : "新增刺青師"}
              </CardTitle>
              <CardDescription>
                {editingArtist ? "修改刺青師資訊" : "填寫新刺青師的基本資訊"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={
                  editingArtist ? handleUpdateArtist : handleCreateArtist
                }
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                      姓名 *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                    />
                  </div>

                  {!editingArtist && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                        密碼 *
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                      專長
                    </label>
                    <input
                      type="text"
                      value={formData.speciality}
                      onChange={(e) =>
                        setFormData({ ...formData, speciality: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                      作品集網址
                    </label>
                    <input
                      type="url"
                      value={formData.portfolioUrl}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          portfolioUrl: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-text-primary-dark"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData({ ...formData, active: e.target.checked })
                      }
                      className="mr-2"
                    />
                    <label
                      htmlFor="active"
                      className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark"
                    >
                      啟用狀態
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    取消
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingArtist ? "更新刺青師" : "創建刺青師"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Artists List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="w-5 h-5 mr-2" />
              刺青師列表
            </CardTitle>
            <CardDescription>
              您分店的所有刺青師 ({artists.length} 位)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {artists.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="w-12 h-12 text-text-muted-light mx-auto mb-4" />
                <p className="text-text-muted-light dark:text-text-muted-dark">
                  目前沒有刺青師
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">
                        姓名
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">
                        專長
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">
                        作品集
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">
                        狀態
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-text-primary-light dark:text-text-primary-dark">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {artists.map((artist) => (
                      <tr
                        key={artist.id}
                        className="border-b border-gray-200 dark:border-gray-700"
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-text-primary-light dark:text-text-primary-dark">
                            {artist.user.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-text-muted-light dark:text-text-muted-dark">
                          {artist.user.email}
                        </td>
                        <td className="py-3 px-4 text-text-muted-light dark:text-text-muted-dark">
                          {artist.speciality || "未設定"}
                        </td>
                        <td className="py-3 px-4">
                          {artist.portfolioUrl ? (
                            <a
                              href={artist.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              查看作品集
                            </a>
                          ) : (
                            <span className="text-text-muted-light">無</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              artist.active
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {artist.active ? "啟用" : "停用"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditArtist(artist)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteArtist(artist.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
