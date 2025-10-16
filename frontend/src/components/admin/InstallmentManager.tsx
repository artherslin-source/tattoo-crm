import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, CheckCircle, Clock, DollarSign, AlertCircle } from 'lucide-react';

interface Installment {
  id: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: 'UNPAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paidAt?: string;
  paymentMethod?: string;
  notes?: string;
  isCustom?: boolean;
  autoAdjusted?: boolean;
}

interface Order {
  id: string;
  totalAmount: number;
  finalAmount: number;
  status: string;
  paymentType: string;
  isInstallment: boolean;
  installments: Installment[];
}

interface InstallmentManagerProps {
  order: Order;
  onPaymentRecorded: (installmentId: string, paymentData: { paymentMethod: string; notes?: string }) => Promise<void>;
  onInstallmentUpdated: (installmentId: string, updateData: { dueDate: string; notes?: string }) => Promise<void>;
  onInstallmentAmountAdjusted?: (orderId: string, installmentNo: number, newAmount: number) => Promise<void>;
  userRole?: string;
}

export default function InstallmentManager({
  order,
  onPaymentRecorded,
  onInstallmentUpdated,
  onInstallmentAmountAdjusted,
  userRole
}: InstallmentManagerProps) {
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAmountEditDialogOpen, setIsAmountEditDialogOpen] = useState(false);
  const [editingAmount, setEditingAmount] = useState<number>(0);
  const [paymentData, setPaymentData] = useState({
    paymentMethod: '',
    notes: '',
    paidAt: new Date().toISOString().split('T')[0]
  });
  const [editData, setEditData] = useState({
    dueDate: '',
    amount: 0,
    notes: ''
  });
  
  // ✅ 新增：錯誤訊息狀態
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentMethodError, setPaymentMethodError] = useState('');

  // 處理模態框開啟/關閉時的 pointer-events 清理
  const handlePaymentDialogOpenChange = (open: boolean) => {
    setIsPaymentDialogOpen(open);
    if (!open) {
      // 清理 pointer-events
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
        const elements = document.querySelectorAll('[style*="pointer-events"]');
        elements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.pointerEvents = '';
          }
        });
      }, 100);
    } else {
      // 開啟時也確保清理
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
      }, 50);
    }
  };

  // 全局 pointer-events 清理
  useEffect(() => {
    const cleanup = () => {
      document.body.style.pointerEvents = '';
      document.body.style.overflow = '';
      const elements = document.querySelectorAll('[style*="pointer-events"]');
      elements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.pointerEvents = '';
        }
      });
    };
    
    cleanup();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cleanup();
      }
    };
    
    // 監聽點擊事件，確保 pointer-events 正常
    const handleClick = () => {
      cleanup();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleClick);
      cleanup();
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />已付款</Badge>;
      case 'UNPAID':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />未付款</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />逾期</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800">已取消</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodText = (method?: string) => {
    switch (method) {
      case '現金': return '現金';
      case '信用卡': return '信用卡';
      case '匯款': return '匯款';
      case '轉帳': return '轉帳';
      default: return method || '未指定';
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInstallment) return;
    
    // 清除之前的錯誤訊息
    setErrorMessage(null);
    setPaymentMethodError('');
    
    // 驗證付款方式
    if (!paymentData.paymentMethod || paymentData.paymentMethod.trim() === '') {
      setPaymentMethodError('請選擇付款方式');
      return;
    }
    
    try {
      await onPaymentRecorded(selectedInstallment.id, paymentData);
      setIsPaymentDialogOpen(false);
      setPaymentData({ paymentMethod: '', notes: '', paidAt: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('記錄付款失敗:', error);
      setErrorMessage('記錄付款失敗，請稍後再試。');
      // 5秒後自動清除錯誤訊息
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
  };

  const handleUpdateInstallment = async () => {
    if (!selectedInstallment) return;
    
    // 清除之前的錯誤訊息
    setErrorMessage(null);
    
    try {
      await onInstallmentUpdated(selectedInstallment.id, editData);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('更新分期失敗:', error);
      setErrorMessage('更新分期資料失敗，請稍後再試。');
      // 5秒後自動清除錯誤訊息
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
  };

  const handleAdjustAmount = async () => {
    if (!selectedInstallment || !onInstallmentAmountAdjusted) return;
    
    // 清除之前的錯誤訊息
    setErrorMessage(null);
    
    // ✅ 修正問題5：檢查金額必須為正整數
    if (!Number.isInteger(editingAmount) || editingAmount <= 0) {
      setErrorMessage('請輸入有效的整數金額（新台幣不使用小數）');
      // 5秒後自動清除錯誤訊息
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return;
    }
    
    try {
      await onInstallmentAmountAdjusted(order.id, selectedInstallment.installmentNo, editingAmount);
      setIsAmountEditDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      console.error('調整分期金額失敗:', error);
      setErrorMessage('調整分期金額失敗，請稍後再試。');
      // 5秒後自動清除錯誤訊息
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
  };

  const openAmountEditDialog = (installment: Installment) => {
    setSelectedInstallment(installment);
    setEditingAmount(installment.amount);
    setIsAmountEditDialogOpen(true);
  };

  const openPaymentDialog = (installment: Installment) => {
    setSelectedInstallment(installment);
    setIsPaymentDialogOpen(true);
  };

  const openEditDialog = (installment: Installment) => {
    setSelectedInstallment(installment);
    setEditData({
      dueDate: installment.dueDate.split('T')[0],
      amount: installment.amount,
      notes: installment.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const totalPaid = order.installments
    .filter(i => i.status === 'PAID')
    .reduce((sum, i) => sum + i.amount, 0);
  
  const totalUnpaid = order.installments
    .filter(i => i.status === 'UNPAID' || i.status === 'OVERDUE')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* 訂單摘要 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            分期付款摘要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(order.finalAmount)}
              </div>
              <div className="text-sm text-gray-600">訂單總額</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </div>
              <div className="text-sm text-gray-600">已付款</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(totalUnpaid)}
              </div>
              <div className="text-sm text-gray-600">未付款</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分期付款列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            分期付款明細
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* ✅ 問題1修正：固定按期別排序 */}
            {[...order.installments].sort((a, b) => a.installmentNo - b.installmentNo).map((installment) => (
              <div
                key={installment.id}
                className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col gap-3 text-sm text-gray-600 md:flex-row md:items-center md:gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <Badge variant="outline">第{installment.installmentNo}期</Badge>
                    {getStatusBadge(installment.status)}
                  </div>
                  <div>到期日：{formatDate(installment.dueDate)}</div>
                  {installment.paidAt && <div>付款日：{formatDate(installment.paidAt)}</div>}
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                  <div className="text-left md:text-right">
                    <div className="text-lg font-medium">
                      {formatCurrency(installment.amount)}
                    </div>
                    {installment.paymentMethod && (
                      <div className="text-sm text-gray-600">
                        {getPaymentMethodText(installment.paymentMethod)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:justify-end">
                    {installment.status === 'UNPAID' || installment.status === 'OVERDUE' ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => openPaymentDialog(installment)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          記錄付款
                        </Button>
                        {(userRole === 'BOSS' || userRole === 'BRANCH_MANAGER') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAmountEditDialog(installment)}
                            className="border-blue-600 text-blue-600 hover:bg-blue-50"
                          >
                            <DollarSign className="mr-1 h-4 w-4" />
                            調整金額
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(installment)}>
                          編輯
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(installment)}>
                        查看詳情
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 記錄付款對話框 */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={handlePaymentDialogOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>記錄付款</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">第{selectedInstallment?.installmentNo}期</div>
              <div className="text-2xl font-bold">
                {selectedInstallment && formatCurrency(selectedInstallment.amount)}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment-method">付款方式</Label>
              <div className="relative">
                <Input
                  id="payment-method"
                  type="text"
                  value={paymentData.paymentMethod}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaymentData({...paymentData, paymentMethod: value});
                    setPaymentMethodError('');
                  }}
                  className="w-full"
                  placeholder="請輸入或選擇付款方式"
                />
              </div>
              {paymentMethodError && (
                <p className="text-xs text-red-600">{paymentMethodError}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">快速選擇：</span>
                {['現金', '信用卡', '匯款', '轉帳'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentData({...paymentData, paymentMethod: method});
                      setPaymentMethodError('');
                    }}
                    className={`px-2 py-1 text-xs rounded border ${
                      paymentData.paymentMethod === method
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paid-at">付款日期</Label>
              <Input
                id="paid-at"
                type="date"
                value={paymentData.paidAt}
                onChange={(e) => setPaymentData({...paymentData, paidAt: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes">備註</Label>
              <Input
                id="payment-notes"
                placeholder="付款備註..."
                value={paymentData.notes}
                onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleRecordPayment} className="bg-green-600 hover:bg-green-700">
                確認付款
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 編輯分期對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯分期付款</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-due-date">到期日</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={editData.dueDate}
                onChange={(e) => setEditData({...editData, dueDate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">金額</Label>
              <Input
                id="edit-amount"
                type="number"
                value={editData.amount}
                disabled
                className="bg-gray-100 text-gray-600 cursor-not-allowed"
                readOnly
              />
              <p className="text-xs text-gray-500">
                分期金額只能透過「調整金額」功能修改
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">備註</Label>
              <Input
                id="edit-notes"
                placeholder="分期備註..."
                value={editData.notes}
                onChange={(e) => setEditData({...editData, notes: e.target.value})}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdateInstallment}>
                更新
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 調整金額對話框 */}
      <Dialog open={isAmountEditDialogOpen} onOpenChange={setIsAmountEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>調整分期金額</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600">第{selectedInstallment?.installmentNo}期</div>
              <div className="text-lg font-medium text-blue-800">
                原金額：{selectedInstallment && formatCurrency(selectedInstallment.amount)}
              </div>
            </div>

            {/* 計算提示信息 */}
            {selectedInstallment && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-sm text-gray-700">
                  <div className="flex justify-between mb-1">
                    <span>訂單總額：</span>
                    <span className="font-medium">{formatCurrency(order.finalAmount)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>已付款：</span>
                    <span className="font-medium">{formatCurrency(
                      order.installments.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0)
                    )}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>未付總額：</span>
                    <span className="font-medium">{formatCurrency(
                      order.finalAmount - order.installments.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0)
                    )}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      固定金額
                      <span className="text-xs text-gray-500 ml-1">（已付款 + 已鎖定分期）</span>
                      ：
                    </span>
                    <span className="font-medium">{formatCurrency(
                      order.installments
                        .filter(i => i.installmentNo !== selectedInstallment.installmentNo && 
                                    (i.status === 'PAID' || i.isCustom === true))
                        .reduce((sum, i) => sum + i.amount, 0)
                    )}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {/* ✅ 問題3修正：錯誤訊息顯示在標題右側 */}
              <div className="flex items-center justify-between">
                <Label htmlFor="new-amount">新金額</Label>
                {errorMessage && (
                  <div className="flex items-center gap-1 text-red-600 animate-pulse">
                    <AlertCircle className="h-3 w-3" />
                    <span className="text-xs font-medium">{errorMessage}</span>
                  </div>
                )}
              </div>
              {/* ✅ 問題2修正：可輸入範圍顯示在輸入欄位下方 */}
              {selectedInstallment && (() => {
                const paidSum = order.installments.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);
                const lockedUnpaidSum = order.installments
                  .filter(i => i.installmentNo !== selectedInstallment.installmentNo && 
                              i.status !== 'PAID' && 
                              i.isCustom === true)
                  .reduce((sum, i) => sum + i.amount, 0);
                const maxAllowed = order.finalAmount - paidSum - lockedUnpaidSum;
                const adjustableCount = order.installments.filter(
                  i => i.installmentNo !== selectedInstallment.installmentNo &&
                       i.status !== 'PAID' &&
                       i.isCustom !== true
                ).length;

                return (
                  <div className="text-xs text-gray-500 mb-2">
                    可輸入範圍：1 ~ {formatCurrency(maxAllowed)}
                    {adjustableCount === 0 && (
                      <span className="text-orange-600 font-medium ml-2">
                        ⚠️ 必須剛好為 {formatCurrency(maxAllowed)}（無其他可調整分期）
                      </span>
                    )}
                  </div>
                );
              })()}
              <Input
                id="new-amount"
                type="number"
                placeholder="輸入新金額"
                value={isNaN(editingAmount) ? '' : (editingAmount === 0 ? '' : editingAmount)}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setEditingAmount(0);
                  } else {
                    const numValue = parseInt(value);
                    setEditingAmount(isNaN(numValue) ? 0 : numValue);
                  }
                }}
                min="0"
              />
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">注意</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                調整此期金額後，其他未付款且未鎖定的分期金額將自動重新分配，確保總金額不變。
                已付款和已手動鎖定的分期不會被影響。
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAmountEditDialogOpen(false)}>
                取消
              </Button>
              <Button 
                onClick={handleAdjustAmount}
                disabled={editingAmount < 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                確認調整
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
