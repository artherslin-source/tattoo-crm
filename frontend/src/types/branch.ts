// 統一的 Branch 類型定義
export interface Branch {
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
  [key: string]: unknown;
}

// 擴展 BranchLike 以確保相容性
export interface BranchLike {
  id?: string | number;
  name?: string;
  [key: string]: unknown;
}
