"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAccessToken, getUserRole, clearTokens } from "@/lib/api";
import AdminLayout from "@/components/layout/AdminLayout";


export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // 初始化 token 和 role
  useEffect(() => {
    const currentToken = getAccessToken();
    const currentRole = getUserRole();
    
    console.log('Admin layout check:', { token: currentToken ? 'Present' : 'Missing', userRole: currentRole });
    
    setToken(currentToken);
    setUserRole(currentRole);
  }, []); // 初始化只執行一次

  // 監聽 token 變化，執行權限驗證
  useEffect(() => {
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      // 不跳轉，讓頁面顯示錯誤信息
      setLoading(false);
      return;
    }
    
    setLoading(false);
  }, [token, userRole]); // 依賴固定的 state

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-on-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-on-dark-muted">驗證管理員權限中...</p>
        </div>
      </div>
    );
  }

  // 如果沒有 token 或權限不足，顯示錯誤頁面
  if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-on-dark flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-on-dark mb-2">
            {!token ? '需要登入' : '權限不足'}
          </h2>
          <p className="text-on-dark-muted mb-6">
            {!token
              ? '請先登入以訪問管理員功能'
              : '您沒有訪問管理員功能的權限'
            }
          </p>
          <div className="space-x-4">
            {!token && (
              <button
                onClick={() => router.push('/login')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                前往登入
              </button>
            )}
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 border border-[var(--line-light)] bg-[var(--paper)] text-on-light rounded-md hover:bg-[color-mix(in_srgb,var(--paper)_85%,#fff)]"
            >
              返回首頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}