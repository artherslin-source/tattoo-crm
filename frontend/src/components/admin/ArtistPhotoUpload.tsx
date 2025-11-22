"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { getApiBase } from "@/lib/api";
import Image from "next/image";

interface ArtistPhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoUploaded: (photoUrl: string) => void;
  disabled?: boolean;
}

export function ArtistPhotoUpload({
  currentPhotoUrl,
  onPhotoUploaded,
  disabled = false,
}: ArtistPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 驗證文件類型
    if (!file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/i)) {
      alert('只允許上傳圖片文件 (JPG, JPEG, PNG, GIF, WebP)');
      return;
    }

    // 驗證文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('圖片大小不能超過 10MB');
      return;
    }

    // 創建預覽
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 立即上傳
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const backendUrl = getApiBase();
      const uploadUrl = `${backendUrl}/admin/artists/upload-photo`;
      
      console.log('📤 開始上傳刺青師照片:', {
        url: uploadUrl,
        filename: file.name,
        size: file.size
      });

      const token = localStorage.getItem("accessToken");
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${token}`,
          // 不要設置 Content-Type，讓瀏覽器自動設置 multipart/form-data boundary
        },
        body: formData,
      });

      console.log('📥 上傳響應:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorMessage = '照片上傳失敗';
        
        try {
          const errorText = await response.text();
          console.error('❌ 錯誤響應內容:', errorText);
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (parseError) {
            errorMessage = errorText || response.statusText || errorMessage;
          }
        } catch (e) {
          console.error('❌ 讀取錯誤響應失敗:', e);
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ 照片上傳成功:', data);

      if (data.url) {
        onPhotoUploaded(data.url);
        // 清除預覽，因為已經上傳成功
        setPreview(null);
        // 重置文件輸入
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error('上傳響應中沒有照片 URL');
      }
    } catch (error) {
      console.error('❌ 照片上傳錯誤:', error);
      alert(error instanceof Error ? error.message : '照片上傳失敗，請重試');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onPhotoUploaded('');
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = preview || currentPhotoUrl;
  const imageUrl = displayUrl 
    ? (displayUrl.startsWith('http') ? displayUrl : `${getApiBase()}${displayUrl}`)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
          id="artist-photo-upload"
        />
        <label htmlFor="artist-photo-upload">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            className="cursor-pointer"
            asChild
          >
            <span>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? '上傳中...' : '選擇照片'}
            </span>
          </Button>
        </label>
        {displayUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={disabled || uploading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            移除
          </Button>
        )}
      </div>

      {imageUrl && (
        <div className="relative w-32 h-32 border rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
          <Image
            src={imageUrl}
            alt="刺青師照片"
            fill
            className="object-cover"
            onError={(e) => {
              console.error('❌ 照片載入失敗:', imageUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {!imageUrl && !uploading && (
        <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <div className="text-center">
            <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-xs text-gray-500">尚未上傳照片</p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        支持 JPG、PNG、GIF、WebP 格式，最大 10MB
      </p>
    </div>
  );
}

