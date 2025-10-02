"use client";

import { useEffect, useState } from "react";
import { getJsonWithAuth, postJsonWithAuth, postFormDataWithAuth, deleteJsonWithAuth, getApiBase } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload,
  Image as ImageIcon,
  Tag,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Camera
} from "lucide-react";

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_TAGS = [
  '背後左或右圖', '半胛圖', '排胛圖', '腹肚圖', '大背到大腿圖', '大背後圖', '大腿表面', '大腿全包',
  '大小腿包全肢', '單胸腹肚圖', '單胸到包全手', '單胸口', '前手臂', '小腿表面', '小腿全包', 
  '上下手臂全肢', '上手臂', '雙前胸口圖', '雙胸到腹肚圖'
];

export default function ArtistPortfolio() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 表單狀態
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    image: null as File | null,
  });

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth<PortfolioItem[]>('/artist/portfolio');
      setPortfolioItems(data);
    } catch (err) {
      setError('載入作品失敗');
      console.error('Portfolio fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 檢查檔案類型
      if (!file.type.startsWith('image/')) {
        alert('請選擇圖片檔案');
        return;
      }
      // 檢查檔案大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('圖片檔案大小不能超過 5MB');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('請輸入作品標題');
      return;
    }
    
    if (!formData.image && !editingItem) {
      alert('請選擇圖片');
      return;
    }

    try {
      setUploading(true);
      
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('tags', JSON.stringify(formData.tags));
      
      if (formData.image) {
        submitData.append('image', formData.image);
      }

      if (editingItem) {
        // 更新現有作品
        await postFormDataWithAuth(`/artist/portfolio/${editingItem.id}`, submitData);
      } else {
        // 新增作品
        await postFormDataWithAuth('/artist/portfolio', submitData);
      }

      // 重置表單
      setFormData({
        title: '',
        description: '',
        tags: [],
        image: null,
      });
      setShowUploadForm(false);
      setEditingItem(null);
      fetchPortfolio();
    } catch (err) {
      console.error('Upload error:', err);
      alert('上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      tags: item.tags,
      image: null,
    });
    setShowUploadForm(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('確定要刪除這個作品嗎？')) {
      return;
    }

    try {
      await deleteJsonWithAuth(`/artist/portfolio/${itemId}`);
      fetchPortfolio();
    } catch (err) {
      console.error('Delete error:', err);
      alert('刪除失敗');
    }
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      tags: [],
      image: null,
    });
    setShowUploadForm(false);
    setEditingItem(null);
  };

  // 篩選作品
  const filteredItems = portfolioItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => item.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchPortfolio} className="mt-4">
            重新載入
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8">
      {/* 頁面標題和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">作品管理</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">管理您的刺青作品集</p>
        </div>
        
        <Button
          onClick={() => setShowUploadForm(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增作品
        </Button>
      </div>

      {/* 搜尋和篩選 */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="搜尋作品標題或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* 標籤篩選 - 響應式佈局 */}
        <div className="w-full">
          <div className="grid grid-rows-2 grid-flow-col gap-2 sm:gap-3 md:gap-4 max-w-full overflow-x-auto">
            {AVAILABLE_TAGS.map(tag => (
              <Badge
                key={tag}
                variant="outline"
                className={`cursor-pointer transition-all duration-200 text-center text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 whitespace-nowrap ${
                  selectedTags.includes(tag) 
                    ? 'bg-orange-500 border-white text-white hover:bg-orange-600' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  setSelectedTags(prev => 
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  );
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* 上傳表單 */}
      {showUploadForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingItem ? '編輯作品' : '新增作品'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  作品標題 *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="輸入作品標題"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  作品描述
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="描述這個作品的特點、靈感來源等..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  標籤
                </label>
                <div className="grid grid-rows-2 grid-flow-col gap-2 sm:gap-3 md:gap-4 max-w-full overflow-x-auto">
                  {AVAILABLE_TAGS.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={`cursor-pointer transition-all duration-200 text-center text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 whitespace-nowrap ${
                        formData.tags.includes(tag) 
                          ? 'bg-orange-500 border-white text-white hover:bg-orange-600' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingItem ? '更換圖片' : '上傳圖片 *'}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    {formData.image ? (
                      <div>
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          {formData.image.name}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Camera className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          點擊選擇圖片或拖拽到這裡
                        </p>
                        <p className="text-xs text-gray-500">
                          支援 JPG、PNG 格式，最大 5MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {editingItem ? '更新作品' : '上傳作品'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={uploading}
                >
                  <X className="mr-2 h-4 w-4" />
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 作品列表 */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || selectedTags.length > 0 ? '找不到符合條件的作品' : '還沒有作品'}
            </h3>
            <p className="text-gray-500">
              {searchTerm || selectedTags.length > 0 ? '請嘗試其他搜尋條件' : '開始上傳您的第一個作品吧！'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-square relative">
                <img
                  src={`${getApiBase()}${item.imageUrl}`}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(item)}
                    className="h-10 w-10 p-0 bg-white/90 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200"
                    title="編輯作品"
                  >
                    <Edit className="h-5 w-5 text-gray-700" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(item.id)}
                    className="h-10 w-10 p-0 bg-red-500/90 hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-200 border border-red-300"
                    title="刪除作品"
                  >
                    <Trash2 className="h-5 w-5 text-white" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {formatDate(item.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
