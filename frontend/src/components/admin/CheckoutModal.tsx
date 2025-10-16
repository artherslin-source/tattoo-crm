import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CreditCard, DollarSign, AlertCircle } from 'lucide-react';

interface Order {
  id: string;
  totalAmount: number;
  finalAmount: number;
  status: string;
  member: {
    id: string;
    name: string | null;
    email: string;
  };
  branch: {
    id: string;
    name: string;
  };
}

interface CheckoutModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckout: (orderId: string, checkoutData: {
    paymentType: 'ONE_TIME' | 'INSTALLMENT';
    installmentTerms?: number;
    startDate?: string;
    customPlan?: { [key: number]: number };
  }) => Promise<void>;
  userRole?: string;
}

export default function CheckoutModal({
  order,
  isOpen,
  onClose,
  onCheckout,
  userRole
}: CheckoutModalProps) {
  const [paymentType, setPaymentType] = useState<'ONE_TIME' | 'INSTALLMENT'>('ONE_TIME');
  const [installmentTerms, setInstallmentTerms] = useState(3);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customPlan, setCustomPlan] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);

  // 處理模態框開啟/關閉時的 pointer-events 清理
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
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

  if (!order) return null;

  // 計算分期付款金額 - 與 InstallmentManager 邏輯保持一致
  const calculateInstallmentAmounts = () => {
    if (paymentType === 'ONE_TIME') return [];

    const totalAmount = order.finalAmount;
    const customTotal = Object.values(customPlan).reduce((sum, amount) => sum + amount, 0);
    const remainingAmount = totalAmount - customTotal;
    const nonCustomCount = installmentTerms - Object.keys(customPlan).length;

    // 計算非自定義期數的平均金額
    const baseAmount = nonCustomCount > 0 ? Math.floor(remainingAmount / nonCustomCount) : 0;
    const remainder = nonCustomCount > 0 ? remainingAmount - (baseAmount * nonCustomCount) : 0;
    let nonCustomIndex = 0;

    const amounts = [];

    for (let i = 1; i <= installmentTerms; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i - 1);

      let amount: number;
      let isCustom = false;

      if (customPlan[i]) {
        // 自定義金額
        amount = customPlan[i];
        isCustom = true;
      } else {
        // 自動分配金額
        amount = baseAmount;
        if (nonCustomIndex === nonCustomCount - 1) {
          // 最後一期加上餘額
          amount += remainder;
        }
        nonCustomIndex++;
      }

      amounts.push({
        installmentNo: i,
        amount,
        dueDate: dueDate.toISOString().split('T')[0],
        isCustom
      });
    }

    return amounts;
  };

  const installmentAmounts = calculateInstallmentAmounts();

  const handleCustomAmountChange = (installmentNo: number, value: string) => {
    if (value === '') {
      // 空值時設為0
      setCustomPlan(prev => ({ ...prev, [installmentNo]: 0 }));
    } else {
      const amount = parseInt(value);
      if (!isNaN(amount) && amount >= 0) {
        // 有效的非負數值
        setCustomPlan(prev => ({ ...prev, [installmentNo]: amount }));
      }
    }
  };

  const handleCheckout = async () => {
    if (!order) return;

    // 檢查分期付款中是否有金額為0的情況
    if (paymentType === 'INSTALLMENT') {
      const hasZeroAmount = installmentAmounts.some(installment => installment.amount === 0);
      if (hasZeroAmount) {
        alert('分期付款金額不能為0，請檢查並修正金額設定。');
        return;
      }
    }

    setLoading(true);
    try {
      const checkoutData: {
        paymentType: 'ONE_TIME' | 'INSTALLMENT';
        installmentTerms?: number;
        startDate?: string;
        customPlan?: { [key: number]: number };
      } = {
        paymentType: paymentType as 'ONE_TIME' | 'INSTALLMENT'
      };

      if (paymentType === 'INSTALLMENT') {
        checkoutData.installmentTerms = installmentTerms;
        checkoutData.startDate = startDate;
        if (Object.keys(customPlan).length > 0) {
          checkoutData.customPlan = customPlan;
        }
      }

      await onCheckout(order.id, checkoutData);
      onClose();
    } catch (error) {
      console.error('結帳失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-full md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            訂單結帳
          </DialogTitle>
          <DialogDescription>
            為訂單 #{order.id.slice(-8)} 選擇付款方式並完成結帳
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 訂單資訊 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">訂單資訊</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">客戶</Label>
                  <p className="text-lg font-semibold">{order.member.name}</p>
                  <p className="text-sm text-gray-600">{order.member.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">分店</Label>
                  <p className="text-lg font-semibold">{order.branch.name}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-600">訂單金額</Label>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(order.finalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 付款方式選擇 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">付款方式</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentType} onValueChange={(value: 'ONE_TIME' | 'INSTALLMENT') => setPaymentType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ONE_TIME" id="one-time" />
                  <Label htmlFor="one-time" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    一次付清
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="INSTALLMENT" id="installment" />
                  <Label htmlFor="installment" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    分期付款
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 分期付款設定 */}
          {paymentType === 'INSTALLMENT' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">分期付款設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="installment-terms">分期期數</Label>
                    <Select value={installmentTerms.toString()} onValueChange={(value) => setInstallmentTerms(parseInt(value))}>
                      <SelectTrigger style={{ pointerEvents: 'auto' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white/85">
                        <SelectItem value="2">2期</SelectItem>
                        <SelectItem value="3">3期</SelectItem>
                        <SelectItem value="6">6期</SelectItem>
                        <SelectItem value="12">12期</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="start-date">開始日期</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* 分期金額預覽 */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">分期付款預覽</Label>
                  <div className="space-y-2">
                    {installmentAmounts.map((installment) => (
                      <div key={installment.installmentNo} className="flex items-center justify-between p-3 bg-white rounded border">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">第{installment.installmentNo}期</Badge>
                          <span className="text-sm text-gray-600">
                            到期日：{formatDate(installment.dueDate)}
                          </span>
                          {installment.isCustom && (
                            <Badge variant="secondary" className="text-xs">自訂</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(userRole === 'BOSS' || userRole === 'BRANCH_MANAGER') && (
                            <Input
                              type="number"
                              value={installment.amount}
                              onChange={(e) => handleCustomAmountChange(installment.installmentNo, e.target.value)}
                              className="w-24 h-8 text-sm"
                              placeholder="金額"
                            />
                          )}
                          <span className="font-medium text-blue-600 min-w-[80px] text-right">
                            {formatCurrency(installment.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
                    <span className="font-medium">總金額</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(installmentAmounts.reduce((sum, i) => sum + i.amount, 0))}
                    </span>
                  </div>
                </div>

                {(userRole === 'BOSS' || userRole === 'BRANCH_MANAGER') && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">管理員權限</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      您可以點擊金額欄位修改某一期的付款金額，其他期數會自動重新分配。
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button onClick={handleCheckout} disabled={loading}>
              {loading ? '處理中...' : '確認結帳'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

