// 基礎 BranchLike 類型 - 用於工具函數
export interface BranchLike {
  id?: string | number;
  name?: string;
  [key: string]: unknown;
}

// 統一的 Branch 類型定義 - 擴展 BranchLike
export interface Branch extends BranchLike {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  businessHours?: string;
  _count?: {
    users: number;
    artists: number;
    orders: number;
    appointments: number;
  };
}
