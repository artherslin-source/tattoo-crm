"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Image as ImageIcon, Check, Trash2 } from "lucide-react";
import { getJsonWithAuth, deleteJsonWithAuth } from "@/lib/api";
import Image from "next/image";

interface ServiceImage {
  filename: string;
  path: string;
  category: string;
  url: string;
  size: number;
  lastModified: string;
  originalName?: string;
  displayName?: string;
}

interface ServiceImagesResponse {
  images: ServiceImage[];
  categories: string[];
  total: number;
}

interface DeleteImageResponse {
  success: boolean;
  message: string;
}

interface ServiceImageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  currentImageUrl?: string;
}

const CATEGORY_LABELS = {
  arm: "手臂",
  leg: "腿部", 
  back: "背部",
  other: "其他",
};

export function ServiceImageSelector({ 
  isOpen, 
  onClose, 
  onSelect, 
  currentImageUrl 
}: ServiceImageSelectorProps) {
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [loading, setLoading] = useState(false);
  // 單張上傳已移除，僅保留批次/多選上傳
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>("other");
  const [searchTerm, setSearchTerm] = useState("");
  const [tempSelectedImage, setTempSelectedImage] = useState<string | null>(null);
  const [batchUploading, setBatchUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // 載入圖片列表
  const loadImages = async (category?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category && category !== "all") {
        params.append("category", category);
      }
      
      const response = await getJsonWithAuth(`/api/admin/services/images?${params.toString()}`) as ServiceImagesResponse;
      setImages(response.images || []);
    } catch (error) {
      console.error("載入圖片失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  // 上傳圖片（批次/單張皆適用）
  // 處理多文件選擇
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setUploadFiles(fileArray);
    }
  };

  // 批次上傳圖片
  const handleBatchUpload = async () => {
    if (uploadFiles.length === 0) {
      alert('請選擇要上傳的圖片');
      return;
    }

    setBatchUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      
      // 添加所有文件
      uploadFiles.forEach((file) => {
        formData.append('images', file);
      });
      formData.append('category', uploadCategory);

      const response = await fetch('/api/admin/services/images/batch-upload', {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        // 嘗試解析錯誤訊息
        let errorMessage = '批次上傳失敗';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // 如果無法解析 JSON，使用狀態文字
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('批次上傳成功:', result);

      // 真實的上傳進度（基於實際進度）
      if (result.total > 0) {
        for (let i = 0; i <= 100; i += Math.ceil(100 / result.total)) {
          setUploadProgress(Math.min(i, 100));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      setUploadProgress(100);

      // 重新載入圖片列表
      await loadImages(selectedCategory);
      
      // 清空上傳文件
      setUploadFiles([]);
      
      alert(`成功上傳 ${result.total} 張圖片！`);
    } catch (error: any) {
      console.error('批次上傳失敗:', error);
      const errorMessage = error.message || '批次上傳失敗，請檢查：\n1. 文件大小是否超過 10MB\n2. 文件格式是否為圖片（JPG、PNG、GIF、WebP）\n3. 網路連線是否正常';
      alert(errorMessage);
    } finally {
      setBatchUploading(false);
      setUploadProgress(0);
    }
  };

  // 單張上傳功能已合併到批次上傳（multiple）

  // 刪除圖片
  const handleDelete = async (image: ServiceImage) => {
    if (!confirm(`確定要刪除圖片 "${image.filename}" 嗎？`)) return;

    try {
      const response = await deleteJsonWithAuth(`/api/admin/services/images/${image.category}/${image.filename}`) as DeleteImageResponse;
      
      if (response.success) {
        // 重新載入圖片列表
        await loadImages(selectedCategory);
      }
    } catch (error) {
      console.error("刪除失敗:", error);
      alert("刪除失敗，請重試");
    }
  };

  // 臨時選擇圖片（不立即套用）
  const handleTempSelectImage = (imageUrl: string) => {
    setTempSelectedImage(imageUrl);
  };

  // 確認選擇圖片
  const handleConfirmSelection = () => {
    if (tempSelectedImage) {
      onSelect(tempSelectedImage);
      onClose();
    }
  };

  // 取消選擇
  const handleCancelSelection = () => {
    setTempSelectedImage(null);
    onClose();
  };

  // 格式化檔案大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 過濾圖片
  const filteredImages = images.filter(image => 
    (image.displayName || image.originalName || image.filename).toLowerCase().includes(searchTerm.toLowerCase()) ||
    CATEGORY_LABELS[image.category as keyof typeof CATEGORY_LABELS]?.includes(searchTerm)
  );

  useEffect(() => {
    if (isOpen) {
      loadImages(selectedCategory);
      setTempSelectedImage(currentImageUrl || null);
    }
  }, [isOpen, selectedCategory, currentImageUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            選擇服務項目圖片
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* 上傳區域 */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-medium mb-3">上傳新圖片</h3>
            
            {/* 上傳區域（支援單張或多張） */}
            <div className="mb-4 p-3 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">上傳圖片</span>
              </div>
              <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mb-2">
                可一次選擇 1 張或多張圖片，上傳至選定分類。
              </p>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="batch-upload-files">選擇圖片（可多選）</Label>
                  <Input
                    id="batch-upload-files"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                  {uploadFiles.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      已選擇 {uploadFiles.length} 張圖片
                    </div>
                  )}
                </div>
                <div className="w-32">
                  <Label htmlFor="batch-upload-category">分類</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleBatchUpload} 
                  disabled={uploadFiles.length === 0 || batchUploading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4" />
                  {batchUploading ? `上傳中... ${uploadProgress}%` : "開始上傳"}
                </Button>
              </div>
              {batchUploading && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 篩選區域 */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="搜尋圖片名稱或分類..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分類</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => loadImages(selectedCategory)}>
              重新整理
            </Button>
          </div>

          {/* 圖片網格 */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">載入中...</div>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">沒有找到圖片</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredImages.map((image) => (
                  <div
                    key={image.path}
                    className={`relative group border rounded-lg overflow-hidden cursor-pointer transition-all ${
                      tempSelectedImage === image.url
                        ? "ring-2 ring-blue-500 border-blue-500"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    }`}
                    onClick={() => handleTempSelectImage(image.url)}
                  >
                    {/* 圖片 */}
                    <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={image.url}
                        alt={image.filename}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      />
                      
                      {/* 選中標記 */}
                      {tempSelectedImage === image.url && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    {/* 圖片資訊 */}
                    <div className="p-2">
                      <div className="text-xs font-medium truncate mb-1" title={(image.displayName || image.originalName || image.filename)}>
                        {image.displayName || image.originalName || image.filename}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <Badge variant="secondary" className="text-xs">
                          {CATEGORY_LABELS[image.category as keyof typeof CATEGORY_LABELS]}
                        </Badge>
                        <span>{formatFileSize(image.size)}</span>
                      </div>
                    </div>

                    {/* 刪除按鈕 */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {tempSelectedImage ? (
              <span className="text-green-600 dark:text-green-400">
                ✓ 已選擇圖片
              </span>
            ) : (
              <span>請選擇一張圖片</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancelSelection}>
              取消
            </Button>
            <Button 
              onClick={handleConfirmSelection}
              disabled={!tempSelectedImage}
              className="bg-blue-600 hover:bg-blue-700"
            >
              確認選擇
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
