import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, DollarSign } from 'lucide-react';

interface InstallmentPaymentSelectorProps {
  totalAmount: number;
  onPaymentTypeChange: (paymentType: 'ONE_TIME' | 'INSTALLMENT', installmentData?: {
    installmentCount: number;
    firstPaymentAmount?: number;
    notes?: string;
  }) => void;
  initialPaymentType?: 'ONE_TIME' | 'INSTALLMENT';
  initialInstallmentData?: {
    installmentCount: number;
    firstPaymentAmount?: number;
    notes?: string;
  };
}

export default function InstallmentPaymentSelector({
  totalAmount,
  onPaymentTypeChange,
  initialPaymentType = 'ONE_TIME',
  initialInstallmentData
}: InstallmentPaymentSelectorProps) {
  const [paymentType, setPaymentType] = useState<'ONE_TIME' | 'INSTALLMENT'>(initialPaymentType);
  const [installmentCount, setInstallmentCount] = useState(initialInstallmentData?.installmentCount || 3);
  const [firstPaymentAmount, setFirstPaymentAmount] = useState(initialInstallmentData?.firstPaymentAmount || '');
  const [notes, setNotes] = useState(initialInstallmentData?.notes || '');

  // 計算分期付款金額
  const calculateInstallmentAmounts = () => {
    if (paymentType === 'ONE_TIME') return [];

    const baseAmount = Math.floor(totalAmount / installmentCount);
    const remainder = totalAmount - (baseAmount * installmentCount);
    const firstAmount = firstPaymentAmount ? parseInt(String(firstPaymentAmount)) : baseAmount;

    const amounts = [];
    let remainingAmount = totalAmount - firstAmount;
    const remainingInstallments = installmentCount - 1;

    amounts.push({
      installmentNo: 1,
      amount: firstAmount,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天後
    });

    for (let i = 1; i < installmentCount; i++) {
      const isLast = i === installmentCount - 1;
      const amount = isLast ? remainingAmount : Math.floor(remainingAmount / remainingInstallments);
      remainingAmount -= amount;

      amounts.push({
        installmentNo: i + 1,
        amount,
        dueDate: new Date(Date.now() + (30 * (i + 1)) * 24 * 60 * 60 * 1000) // 每月同日
      });
    }

    return amounts;
  };

  const installmentAmounts = calculateInstallmentAmounts();

  const handlePaymentTypeChange = (value: string) => {
    const newPaymentType = value as 'ONE_TIME' | 'INSTALLMENT';
    setPaymentType(newPaymentType);
    
    if (newPaymentType === 'INSTALLMENT') {
      onPaymentTypeChange(newPaymentType, {
        installmentCount,
        firstPaymentAmount: firstPaymentAmount ? parseInt(String(firstPaymentAmount)) : undefined,
        notes: notes || undefined
      });
    } else {
      onPaymentTypeChange(newPaymentType);
    }
  };

  const handleInstallmentDataChange = () => {
    if (paymentType === 'INSTALLMENT') {
      onPaymentTypeChange(paymentType, {
        installmentCount,
        firstPaymentAmount: firstPaymentAmount ? parseInt(String(firstPaymentAmount)) : undefined,
        notes: notes || undefined
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          付款方式選擇
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 付款方式選擇 */}
        <div className="space-y-4">
          <Label className="text-base font-medium">選擇付款方式</Label>
          <RadioGroup value={paymentType} onValueChange={handlePaymentTypeChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ONE_TIME" id="one-time" />
              <Label htmlFor="one-time" className="flex items-center gap-2 cursor-pointer">
                <DollarSign className="h-4 w-4" />
                一次付清
                <Badge variant="outline" className="ml-2">
                  {formatCurrency(totalAmount)}
                </Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="INSTALLMENT" id="installment" />
              <Label htmlFor="installment" className="flex items-center gap-2 cursor-pointer">
                <Calendar className="h-4 w-4" />
                分期付款
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 分期付款設定 */}
        {paymentType === 'INSTALLMENT' && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="installment-count">分期期數</Label>
                <Select 
                  value={installmentCount.toString()} 
                  onValueChange={(value) => {
                    setInstallmentCount(parseInt(value));
                    setTimeout(handleInstallmentDataChange, 0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2期</SelectItem>
                    <SelectItem value="3">3期</SelectItem>
                    <SelectItem value="6">6期</SelectItem>
                    <SelectItem value="12">12期</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="first-payment">首期金額（可選）</Label>
                <Input
                  id="first-payment"
                  type="number"
                  placeholder="留空則平均分配"
                  value={firstPaymentAmount}
                  onChange={(e) => {
                    setFirstPaymentAmount(e.target.value);
                    setTimeout(handleInstallmentDataChange, 0);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Input
                id="notes"
                placeholder="分期付款備註..."
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setTimeout(handleInstallmentDataChange, 0);
                }}
              />
            </div>

            {/* 分期付款預覽 */}
            {installmentAmounts.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">分期付款預覽</Label>
                <div className="space-y-2">
                  {installmentAmounts.map((installment) => (
                    <div key={installment.installmentNo} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">第{installment.installmentNo}期</Badge>
                        <span className="text-sm text-text-muted-light">
                          到期日：{formatDate(installment.dueDate)}
                        </span>
                      </div>
                      <span className="font-medium text-blue-600">
                        {formatCurrency(installment.amount)}
                      </span>
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
            )}
          </div>
        )}

        {/* 總金額顯示 */}
        <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
          <span className="text-lg font-medium">訂單總金額</span>
          <span className="text-2xl font-bold text-green-600">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
