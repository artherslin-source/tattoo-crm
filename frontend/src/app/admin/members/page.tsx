"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, deleteJsonWithAuth, patchJsonWithAuth, postJsonWithAuth, ApiError } from "@/lib/api";
import { getUniqueBranches, sortBranchesByName } from "@/lib/branch-utils";
import type { Branch } from "@/types/branch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Users, ArrowLeft, Plus } from "lucide-react";
import MembersToolbar from "@/components/admin/MembersToolbar";
import MembersTable from "@/components/admin/MembersTable";
import MembersCards from "@/components/admin/MembersCards";

interface Member {
  id: string;
  totalSpent: number;
  balance: number;
  membershipLevel?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'MEMBER' | 'ADMIN';
    status: string;
    createdAt: string;
    updatedAt: string;
    branch?: {
      id: string;
      name: string;
    };
  };
}

interface TopupHistory {
  id: string;
  amount: number;
  type?: string;  // "TOPUP" | "SPEND"
  createdAt: string;
  operator?: {
    email: string;
    name: string;
  };
}

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 篩選相關狀態
  const [search, setSearch] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('all');
  const [role, setRole] = useState<string>('all');
  const [membershipLevel, setMembershipLevel] = useState<string>('all');
  
  // 分頁相關狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // 分店資料狀態
  const [branches, setBranches] = useState<Branch[]>([]);
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    isOpen: boolean;
    member: Member | null;
    newPassword: string;
  }>({
    isOpen: false,
    member: null,
    newPassword: '',
  });

  const [topUpModal, setTopUpModal] = useState<{
    isOpen: boolean;
    member: Member | null;
    amount: string;
  }>({
    isOpen: false,
    member: null,
    amount: '',
  });

  const [adjustBalanceModal, setAdjustBalanceModal] = useState<{
    isOpen: boolean;
    member: Member | null;
    amount: string;
  }>({
    isOpen: false,
    member: null,
    amount: '',
  });

  const [spendModal, setSpendModal] = useState<{
    isOpen: boolean;
    member: Member | null;
    amount: string;
  }>({
    isOpen: false,
    member: null,
    amount: '',
  });

  const [createMemberModal, setCreateMemberModal] = useState<{
    isOpen: boolean;
    formData: {
      name: string;
      email: string;
      password: string;
      phone: string;
      branchId: string;
      role: 'MEMBER' | 'ADMIN';
    };
  }>({
    isOpen: false,
    formData: {
      name: '',
      email: '',
      password: '',
      phone: '',
      branchId: '',
      role: 'MEMBER',
    },
  });

  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupHistory, setTopupHistory] = useState<TopupHistory[]>([]);

  // Debug: 監控 topUpModal 和 spendModal 狀態變化
  useEffect(() => {
    console.log('🔵 topUpModal state changed:', topUpModal);
  }, [topUpModal]);

  useEffect(() => {
    console.log('🔴 spendModal state changed:', spendModal);
  }, [spendModal]);

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    fetchMembers();
  }, [router]);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      // 使用 admin/members API，包含排序和篩選參數
      const params = new URLSearchParams();
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
      if (search) params.append('search', search);
      if (branchId && branchId !== 'all') params.append('branchId', branchId);
      if (role && role !== 'all') params.append('role', role);
      if (membershipLevel && membershipLevel !== 'all') params.append('membershipLevel', membershipLevel);
      
      const url = `/admin/members${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await getJsonWithAuth<Member[]>(url);
      setMembers(data);
      setTotalItems(data.length);
      setCurrentPage(1); // 重置到第一頁
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "載入會員資料失敗");
    } finally {
      setLoading(false);
    }
  }, [sortField, sortOrder, search, branchId, role, membershipLevel]);

  // 獲取分店資料
  const fetchBranches = useCallback(async () => {
    try {
      const branchesData = await getJsonWithAuth('/branches') as Array<Record<string, unknown>>;
      
      // 按名稱去重：只保留每個名稱的第一個分店（通常是最新的）
      const uniqueByName = branchesData.reduce((acc, branch) => {
        const name = branch.name as string;
        if (!acc.some(b => (b.name as string) === name)) {
          acc.push(branch);
        }
        return acc;
      }, [] as Array<Record<string, unknown>>);
      
      const uniqueBranches = sortBranchesByName(getUniqueBranches(uniqueByName)) as Branch[];
      setBranches(uniqueBranches);
    } catch (err) {
      console.error('載入分店資料失敗:', err);
    }
  }, []);

  // 初次載入時獲取分店資料
  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // 當排序參數改變時重新載入資料
  useEffect(() => {
    if (sortField && sortOrder) {
      fetchMembers();
    }
  }, [sortField, sortOrder, fetchMembers]);

  // 排序處理函數
  const handleSortFieldChange = (field: string) => {
    setSortField(field);
  };

  const handleSortOrderToggle = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // 分頁計算函數
  const getPaginatedMembers = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return members.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // 重置到第一頁
  };

  // 篩選處理函數
  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleBranchChange = (value: string) => {
    setBranchId(value);
  };

  const handleRoleChange = (value: string) => {
    setRole(value);
  };

  const handleMembershipLevelChange = (value: string) => {
    setMembershipLevel(value);
  };

  // 當 members 改變時，重新計算總項目數
  useEffect(() => {
    setTotalItems(members.length);
  }, [members]);

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('確定要刪除這個會員嗎？此操作無法復原。')) {
      return;
    }

    try {
      await deleteJsonWithAuth(`/admin/members/${memberId}`);
      setMembers(members.filter(member => member.id !== memberId));
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "刪除會員失敗");
    }
  };

  // 新增會員相關函數
  const handleOpenCreateMemberModal = () => {
    setCreateMemberModal({
      isOpen: true,
      formData: {
        name: '',
        email: '',
        password: '',
        phone: '',
        branchId: '',
        role: 'MEMBER',
      },
    });
  };

  const handleCloseCreateMemberModal = () => {
    setCreateMemberModal({
      isOpen: false,
      formData: {
        name: '',
        email: '',
        password: '',
        phone: '',
        branchId: '',
        role: 'MEMBER',
      },
    });
  };

  const handleCreateMemberFormChange = (field: string, value: string) => {
    setCreateMemberModal(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value,
      },
    }));
  };

  const handleCreateMember = async () => {
    try {
      const { name, email, password, phone, branchId, role } = createMemberModal.formData;
      
      if (!name || !email || !password || !phone || !branchId) {
        setError('請填寫所有必填欄位');
        return;
      }

      const newMember = await postJsonWithAuth('/admin/members', {
        name,
        email,
        password,
        phone,
        branchId,
        role,
      }) as Member;

      setMembers([newMember, ...members]);
      setError(null);
      handleCloseCreateMemberModal();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "新增會員失敗");
    }
  };


  const handleOpenResetPasswordModal = (member: Member) => {
    setResetPasswordModal({
      isOpen: true,
      member,
      newPassword: '',
    });
  };

  const handleCloseResetPasswordModal = () => {
    setResetPasswordModal({
      isOpen: false,
      member: null,
      newPassword: '',
    });
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModal.member || !resetPasswordModal.newPassword) {
      setError('請輸入新密碼');
      return;
    }

    if (resetPasswordModal.newPassword.length < 8) {
      setError('密碼長度至少需要 8 個字符');
      return;
    }

    try {
      await patchJsonWithAuth(`/admin/members/${resetPasswordModal.member.id}/password`, {
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
  const handleOpenTopUpModal = (member: Member) => {
    console.log('🔵 handleOpenTopUpModal called with member:', member);
    setTopUpModal({
      isOpen: true,
      member,
      amount: '',
    });
    console.log('🔵 topUpModal state should be updated');
  };

  const handleCloseTopUpModal = () => {
    setTopUpModal({
      isOpen: false,
      member: null,
      amount: '',
    });
  };

  const handleTopUp = async () => {
    if (!topUpModal.member || !topUpModal.amount) {
      setError('請輸入儲值金額');
      return;
    }

    const amount = parseInt(topUpModal.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('請輸入有效的儲值金額');
      return;
    }

    try {
      await patchJsonWithAuth(`/admin/members/${topUpModal.member.id}/topup`, {
        amount: amount,
      });
      
      setError(null);
      handleCloseTopUpModal();
      fetchMembers(); // 重新載入會員資料
      alert('儲值成功！');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "儲值失敗");
    }
  };

  const handleOpenAdjustBalanceModal = (member: Member) => {
    setAdjustBalanceModal({
      isOpen: true,
      member,
      amount: member.balance?.toString() || '0',
    });
  };

  const handleCloseAdjustBalanceModal = () => {
    setAdjustBalanceModal({
      isOpen: false,
      member: null,
      amount: '',
    });
  };

  const handleAdjustBalance = async () => {
    if (!adjustBalanceModal.member || !adjustBalanceModal.amount) {
      setError('請輸入餘額金額');
      return;
    }

    const amount = parseInt(adjustBalanceModal.amount);
    if (isNaN(amount) || amount < 0) {
      setError('請輸入有效的餘額金額');
      return;
    }

    try {
      await patchJsonWithAuth(`/users/${adjustBalanceModal.member.user.id}/balance`, {
        amount: amount,
      });
      
      setError(null);
      handleCloseAdjustBalanceModal();
      fetchMembers(); // 重新載入會員資料
      alert('餘額調整成功！');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "餘額調整失敗");
    }
  };

  const handleViewTopups = async (memberId: string) => {
    try {
      const res = await getJsonWithAuth<TopupHistory[]>(`/admin/members/${memberId}/topups`);
      setTopupHistory(res);
      setShowTopupModal(true);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "獲取儲值紀錄失敗");
    }
  };

  // 消費相關處理函數
  const handleOpenSpendModal = (member: Member) => {
    console.log('🔴 handleOpenSpendModal called with member:', member);
    setSpendModal({
      isOpen: true,
      member,
      amount: '',
    });
    console.log('🔴 spendModal state should be updated');
  };

  const handleCloseSpendModal = () => {
    setSpendModal({
      isOpen: false,
      member: null,
      amount: '',
    });
  };

  const handleSpend = async () => {
    if (!spendModal.member || !spendModal.amount) {
      setError('請輸入消費金額');
      return;
    }

    const amount = parseInt(spendModal.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('請輸入有效的消費金額');
      return;
    }

    if (amount > (spendModal.member.balance || 0)) {
      setError('消費金額不能超過餘額');
      return;
    }

    try {
      await postJsonWithAuth(`/admin/members/${spendModal.member.id}/spend`, {
        amount: amount,
      });
      
      setError(null);
      handleCloseSpendModal();
      fetchMembers(); // 重新載入會員資料
      alert('消費成功！');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "消費失敗");
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
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center text-3xl font-bold text-gray-900 dark:text-white">
              <Users className="mr-3 h-8 w-8" />
              管理會員
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              管理系統中的所有會員帳號
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={handleOpenCreateMemberModal}
              className="flex w-full items-center justify-center space-x-2 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span>新增會員</span>
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
            <CardTitle className="text-sm font-medium">總會員數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理員數量</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(member => member.user?.role === 'ADMIN').length}
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
              {members.filter(member => member.user?.role === 'MEMBER').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 工具列 */}
      <MembersToolbar
        sortField={sortField}
        sortOrder={sortOrder}
        itemsPerPage={itemsPerPage}
        search={search}
        branchId={branchId}
        role={role}
        membershipLevel={membershipLevel}
        branches={branches}
        onSortFieldChange={handleSortFieldChange}
        onSortOrderToggle={handleSortOrderToggle}
        onItemsPerPageChange={handleItemsPerPageChange}
        onSearchChange={handleSearchChange}
        onBranchChange={handleBranchChange}
        onRoleChange={handleRoleChange}
        onMembershipLevelChange={handleMembershipLevelChange}
      />

      {/* 分頁資訊 */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          共 {totalItems} 個會員，第 {currentPage} / {getTotalPages()} 頁
        </div>
      </div>

      {/* 響應式會員列表 */}
      <Card>
        <CardHeader>
          <CardTitle>會員列表</CardTitle>
          <CardDescription>
            管理系統中的所有會員帳號和權限
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 桌機/平板表格 */}
          <MembersTable
            members={getPaginatedMembers()}
            onTopUp={handleOpenTopUpModal}
            onSpend={handleOpenSpendModal}
            onAdjustBalance={handleOpenAdjustBalanceModal}
            onViewHistory={handleViewTopups}
            onResetPassword={handleOpenResetPasswordModal}
            onDelete={handleDeleteMember}
            getUserRole={() => getUserRole() || ''}
          />

          {/* 手機卡片 */}
          <MembersCards
            members={getPaginatedMembers()}
            onTopUp={handleOpenTopUpModal}
            onSpend={handleOpenSpendModal}
            onAdjustBalance={handleOpenAdjustBalanceModal}
            onViewHistory={handleViewTopups}
            onResetPassword={handleOpenResetPasswordModal}
            onDelete={handleDeleteMember}
            getUserRole={() => getUserRole() || ''}
          />
          
          {members.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              目前沒有會員資料
            </div>
          )}
          
          {/* 分頁導航 */}
          {getTotalPages() > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                上一頁
              </Button>
              
              {/* 頁碼按鈕 */}
              {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => {
                // 只顯示當前頁前後幾頁
                if (
                  page === 1 ||
                  page === getTotalPages() ||
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="w-10"
                    >
                      {page}
                    </Button>
                  );
                } else if (
                  page === currentPage - 3 ||
                  page === currentPage + 3
                ) {
                  return <span key={page} className="text-gray-500">...</span>;
                }
                return null;
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === getTotalPages()}
              >
                下一頁
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

          {/* Reset Password Dialog */}
          <Dialog open={resetPasswordModal.isOpen} onOpenChange={handleCloseResetPasswordModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>重設密碼</DialogTitle>
                <DialogDescription>
                  為用戶 <strong>{resetPasswordModal.member?.user?.name || resetPasswordModal.member?.user?.email}</strong> 重設密碼
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
              </div>
              <DialogFooter>
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
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Top Up Dialog */}
          <Dialog open={topUpModal.isOpen} onOpenChange={handleCloseTopUpModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>儲值</DialogTitle>
                <DialogDescription>
                  為用戶 <strong>{topUpModal.member?.user?.name || topUpModal.member?.user?.email}</strong> 儲值
                  <br />
                  目前儲值餘額：{formatCurrency(topUpModal.member?.balance || 0)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
              </div>
              <DialogFooter>
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
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Spend Dialog */}
          <Dialog open={spendModal.isOpen} onOpenChange={handleCloseSpendModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>消費</DialogTitle>
                <DialogDescription>
                  為用戶 <strong>{spendModal.member?.user?.name || spendModal.member?.user?.email}</strong> 進行消費
                  <br />
                  目前儲值餘額：{formatCurrency(spendModal.member?.balance || 0)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label htmlFor="spendAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    消費金額
                  </label>
                  <input
                    type="number"
                    id="spendAmount"
                    value={spendModal.amount}
                    onChange={(e) => setSpendModal(prev => ({
                      ...prev,
                      amount: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                    placeholder="請輸入消費金額"
                    min="1"
                    max={spendModal.member?.balance || 0}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    消費金額不能超過餘額
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleCloseSpendModal}
                >
                  取消
                </Button>
                <Button
                  onClick={handleSpend}
                  disabled={!spendModal.amount || parseInt(spendModal.amount) <= 0 || parseInt(spendModal.amount) > (spendModal.member?.balance || 0)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  確認消費
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Adjust Balance Dialog */}
          <Dialog open={adjustBalanceModal.isOpen} onOpenChange={handleCloseAdjustBalanceModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>調整餘額</DialogTitle>
                <DialogDescription>
                  為用戶 <strong>{adjustBalanceModal.member?.user?.name || adjustBalanceModal.member?.user?.email}</strong> 調整儲值餘額
                  <br />
                  目前儲值餘額：{formatCurrency(adjustBalanceModal.member?.balance || 0)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
              </div>
              <DialogFooter>
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
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Member Modal */}
          <Dialog open={createMemberModal.isOpen} onOpenChange={handleCloseCreateMemberModal}>
            <DialogContent className="max-w-full sm:max-w-md">
              <DialogHeader>
                <DialogTitle>新增會員</DialogTitle>
                <DialogDescription>
                  填寫以下資訊來新增一個新的會員帳號
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label htmlFor="memberName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    姓名 *
                  </label>
                  <input
                    type="text"
                    id="memberName"
                    value={createMemberModal.formData.name}
                    onChange={(e) => handleCreateMemberFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="請輸入會員姓名"
                  />
                </div>
                <div>
                  <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="memberEmail"
                    value={createMemberModal.formData.email}
                    onChange={(e) => handleCreateMemberFormChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="請輸入會員Email"
                  />
                </div>
                <div>
                  <label htmlFor="memberPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    密碼 *
                  </label>
                  <input
                    type="password"
                    id="memberPassword"
                    value={createMemberModal.formData.password}
                    onChange={(e) => handleCreateMemberFormChange('password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="請輸入密碼"
                  />
                </div>
                <div>
                  <label htmlFor="memberPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    電話 *
                  </label>
                  <input
                    type="tel"
                    id="memberPhone"
                    value={createMemberModal.formData.phone}
                    onChange={(e) => handleCreateMemberFormChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="請輸入電話號碼"
                  />
                </div>
                <div>
                  <label htmlFor="memberBranch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    分店 *
                  </label>
                  <select
                    id="memberBranch"
                    value={createMemberModal.formData.branchId}
                    onChange={(e) => handleCreateMemberFormChange('branchId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">請選擇分店</option>
                    <option value="cmg9i8wsb0001sbc1oh5vfetl">三重店</option>
                    <option value="cmg9i8wse0002sbc1rci6gl0c">東港店</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="memberRole" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    角色
                  </label>
                  <select
                    id="memberRole"
                    value={createMemberModal.formData.role}
                    onChange={(e) => handleCreateMemberFormChange('role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="MEMBER">會員</option>
                    <option value="ADMIN">管理員</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleCloseCreateMemberModal}
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreateMember}
                  disabled={!createMemberModal.formData.name || !createMemberModal.formData.email || !createMemberModal.formData.password || !createMemberModal.formData.phone || !createMemberModal.formData.branchId}
                >
                  新增會員
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 儲值紀錄 Modal */}
          {showTopupModal && (
            <Dialog open={showTopupModal} onOpenChange={setShowTopupModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>儲值與消費紀錄</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {topupHistory.length === 0 ? (
                    <p>尚無儲值或消費紀錄</p>
                  ) : (
                    topupHistory.map((t) => (
                      <div key={t.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{new Date(t.createdAt).toLocaleString()}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              t.type === 'SPEND' 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {t.type === 'SPEND' ? '消費' : '儲值'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {t.operator?.name 
                               ? `${t.operator.name} (${t.operator.email})` 
                               : t.operator?.email ?? '未知'}
                          </span>
                        </div>
                        <span className={`text-sm font-medium ${
                          t.type === 'SPEND' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {t.type === 'SPEND' ? '-' : '+'} NT${t.amount.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
    </div>
  );
}
