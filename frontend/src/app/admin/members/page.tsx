"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, deleteJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Users, Edit, Trash2, ArrowLeft, Key, DollarSign, Wallet } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'MEMBER' | 'ADMIN';
  createdAt: string;
  totalSpent?: number;
  storedValueTotal?: number;
  storedValueBalance?: number;
}

export default function AdminMembersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    isOpen: boolean;
    user: User | null;
    newPassword: string;
  }>({
    isOpen: false,
    user: null,
    newPassword: '',
  });

  const [topUpModal, setTopUpModal] = useState<{
    isOpen: boolean;
    user: User | null;
    amount: string;
  }>({
    isOpen: false,
    user: null,
    amount: '',
  });

  const [adjustBalanceModal, setAdjustBalanceModal] = useState<{
    isOpen: boolean;
    user: User | null;
    amount: string;
  }>({
    isOpen: false,
    user: null,
    amount: '',
  });

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // 使用 admin/members API
      const data = await getJsonWithAuth('/admin/members');
      setUsers(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "載入會員資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('確定要刪除這個會員嗎？此操作無法復原。')) {
      return;
    }

    try {
      await deleteJsonWithAuth(`/admin/members/${userId}`);
      setUsers(users.filter(user => user.id !== userId));
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "刪除會員失敗");
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    
    try {
      await patchJsonWithAuth(`/admin/members/${userId}/role`, { role: newRole });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole as 'MEMBER' | 'ADMIN' } : user
      ));
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "更新角色失敗");
    }
  };

  const handleOpenResetPasswordModal = (user: User) => {
    setResetPasswordModal({
      isOpen: true,
      user,
      newPassword: '',
    });
  };

  const handleCloseResetPasswordModal = () => {
    setResetPasswordModal({
      isOpen: false,
      user: null,
      newPassword: '',
    });
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModal.user || !resetPasswordModal.newPassword) {
      setError('請輸入新密碼');
      return;
    }

    if (resetPasswordModal.newPassword.length < 8) {
      setError('密碼長度至少需要 8 個字符');
      return;
    }

    try {
      await patchJsonWithAuth(`/admin/members/${resetPasswordModal.user.id}/password`, {
        password: resetPasswordModal.newPassword,
      });
      
      setError(null);
      handleCloseResetPasswordModal();
      alert('密碼重設成功！');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "重設密碼失敗");
    }
  };

  // 財務相關處理函數
  const handleOpenTopUpModal = (user: User) => {
    setTopUpModal({
      isOpen: true,
      user,
      amount: '',
    });
  };

  const handleCloseTopUpModal = () => {
    setTopUpModal({
      isOpen: false,
      user: null,
      amount: '',
    });
  };

  const handleTopUp = async () => {
    if (!topUpModal.user || !topUpModal.amount) {
      setError('請輸入儲值金額');
      return;
    }

    const amount = parseInt(topUpModal.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('請輸入有效的儲值金額');
      return;
    }

    try {
      await patchJsonWithAuth(`/users/${topUpModal.user.id}/topup`, {
        amount: amount,
      });
      
      setError(null);
      handleCloseTopUpModal();
      fetchUsers(); // 重新載入用戶資料
      alert('儲值成功！');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "儲值失敗");
    }
  };

  const handleOpenAdjustBalanceModal = (user: User) => {
    setAdjustBalanceModal({
      isOpen: true,
      user,
      amount: user.storedValueBalance?.toString() || '0',
    });
  };

  const handleCloseAdjustBalanceModal = () => {
    setAdjustBalanceModal({
      isOpen: false,
      user: null,
      amount: '',
    });
  };

  const handleAdjustBalance = async () => {
    if (!adjustBalanceModal.user || !adjustBalanceModal.amount) {
      setError('請輸入餘額金額');
      return;
    }

    const amount = parseInt(adjustBalanceModal.amount);
    if (isNaN(amount) || amount < 0) {
      setError('請輸入有效的餘額金額');
      return;
    }

    try {
      await patchJsonWithAuth(`/users/${adjustBalanceModal.user.id}/balance`, {
        amount: amount,
      });
      
      setError(null);
      handleCloseAdjustBalanceModal();
      fetchUsers(); // 重新載入用戶資料
      alert('餘額調整成功！');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "餘額調整失敗");
    }
  };

  // 格式化金額
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "NT$ 0";
    return `NT$ ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">載入會員資料中...</p>
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
              <Users className="mr-3 h-8 w-8" />
              管理會員
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              管理系統中的所有會員帳號
            </p>
          </div>
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
            <CardTitle className="text-sm font-medium">總會員數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理員數量</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(user => user.role === 'ADMIN').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">一般會員</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(user => user.role === 'MEMBER').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>會員列表</CardTitle>
          <CardDescription>
            管理系統中的所有會員帳號和權限
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">姓名</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">角色</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">累計消費</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">儲值總額</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">儲值餘額</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">註冊時間</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">操作</th>
                    </tr>
                  </thead>
              <tbody>
                {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.name || '未設定'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'ADMIN' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {user.role === 'ADMIN' ? '管理員' : '會員'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {formatCurrency(user.totalSpent)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(user.storedValueTotal)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        <span className="font-medium text-purple-600 dark:text-purple-400">
                          {formatCurrency(user.storedValueBalance)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleRole(user.id, user.role)}
                            className="flex items-center space-x-1"
                          >
                            <Edit className="h-3 w-3" />
                            <span>{user.role === 'ADMIN' ? '降為會員' : '升為管理員'}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenTopUpModal(user)}
                            className="flex items-center space-x-1 text-green-600 hover:text-green-700"
                          >
                            <DollarSign className="h-3 w-3" />
                            <span>儲值</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdjustBalanceModal(user)}
                            className="flex items-center space-x-1 text-purple-600 hover:text-purple-700"
                          >
                            <Wallet className="h-3 w-3" />
                            <span>調整餘額</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenResetPasswordModal(user)}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                          >
                            <Key className="h-3 w-3" />
                            <span>重設密碼</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
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
          
          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              目前沒有會員資料
            </div>
          )}
        </CardContent>
      </Card>

          {/* Reset Password Modal */}
          <Modal
            isOpen={resetPasswordModal.isOpen}
            onClose={handleCloseResetPasswordModal}
            title="重設密碼"
          >
            {resetPasswordModal.user && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    為用戶 <strong>{resetPasswordModal.user.name || resetPasswordModal.user.email}</strong> 重設密碼
                  </p>
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    新密碼
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={resetPasswordModal.newPassword}
                    onChange={(e) => setResetPasswordModal(prev => ({
                      ...prev,
                      newPassword: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="請輸入新密碼（至少8個字符）"
                    minLength={8}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    密碼長度至少需要 8 個字符
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCloseResetPasswordModal}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleResetPassword}
                    disabled={!resetPasswordModal.newPassword || resetPasswordModal.newPassword.length < 8}
                  >
                    重設密碼
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* Top Up Modal */}
          <Modal
            isOpen={topUpModal.isOpen}
            onClose={handleCloseTopUpModal}
            title="儲值"
          >
            {topUpModal.user && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    為用戶 <strong>{topUpModal.user.name || topUpModal.user.email}</strong> 儲值
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    目前儲值餘額：{formatCurrency(topUpModal.user.storedValueBalance)}
                  </p>
                </div>
                
                <div>
                  <label htmlFor="topUpAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    儲值金額
                  </label>
                  <input
                    type="number"
                    id="topUpAmount"
                    value={topUpModal.amount}
                    onChange={(e) => setTopUpModal(prev => ({
                      ...prev,
                      amount: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="請輸入儲值金額"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    儲值金額必須大於 0
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCloseTopUpModal}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleTopUp}
                    disabled={!topUpModal.amount || parseInt(topUpModal.amount) <= 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    確認儲值
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* Adjust Balance Modal */}
          <Modal
            isOpen={adjustBalanceModal.isOpen}
            onClose={handleCloseAdjustBalanceModal}
            title="調整餘額"
          >
            {adjustBalanceModal.user && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    為用戶 <strong>{adjustBalanceModal.user.name || adjustBalanceModal.user.email}</strong> 調整儲值餘額
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    目前儲值餘額：{formatCurrency(adjustBalanceModal.user.storedValueBalance)}
                  </p>
                </div>
                
                <div>
                  <label htmlFor="adjustAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    新餘額
                  </label>
                  <input
                    type="number"
                    id="adjustAmount"
                    value={adjustBalanceModal.amount}
                    onChange={(e) => setAdjustBalanceModal(prev => ({
                      ...prev,
                      amount: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="請輸入新的餘額"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    餘額不能為負數
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCloseAdjustBalanceModal}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleAdjustBalance}
                    disabled={!adjustBalanceModal.amount || parseInt(adjustBalanceModal.amount) < 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    確認調整
                  </Button>
                </div>
              </div>
            )}
          </Modal>
    </div>
  );
}
