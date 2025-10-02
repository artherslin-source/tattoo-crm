import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  onPaymentRecorded: (installmentId: string, paymentData: any) => Promise<void>;
  onInstallmentUpdated: (installmentId: string, updateData: any) => Promise<void>;
}

export default function InstallmentManager({
  order,
  onPaymentRecorded,
  onInstallmentUpdated
}: InstallmentManagerProps) {
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
    
    try {
      await onPaymentRecorded(selectedInstallment.id, paymentData);
      setIsPaymentDialogOpen(false);
      setPaymentData({ paymentMethod: '', notes: '', paidAt: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('記錄付款失敗:', error);
    }
  };

  const handleUpdateInstallment = async () => {
    if (!selectedInstallment) return;
    
    try {
      await onInstallmentUpdated(selectedInstallment.id, editData);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('更新分期失敗:', error);
    }
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
            {order.installments.map((installment) => (
              <div key={installment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">第{installment.installmentNo}期</Badge>
                    {getStatusBadge(installment.status)}
                  </div>
                  <div className="text-sm text-gray-600">
                    到期日：{formatDate(installment.dueDate)}
                  </div>
                  {installment.paidAt && (
                    <div className="text-sm text-gray-600">
                      付款日：{formatDate(installment.paidAt)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium text-lg">
                      {formatCurrency(installment.amount)}
                    </div>
                    {installment.paymentMethod && (
                      <div className="text-sm text-gray-600">
                        {getPaymentMethodText(installment.paymentMethod)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {installment.status === 'UNPAID' || installment.status === 'OVERDUE' ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => openPaymentDialog(installment)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          記錄付款
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(installment)}
                        >
                          編輯
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(installment)}
                      >
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
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
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
              <Select value={paymentData.paymentMethod} onValueChange={(value) => setPaymentData({...paymentData, paymentMethod: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇付款方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="現金">現金</SelectItem>
                  <SelectItem value="信用卡">信用卡</SelectItem>
                  <SelectItem value="匯款">匯款</SelectItem>
                  <SelectItem value="轉帳">轉帳</SelectItem>
                </SelectContent>
              </Select>
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
        <DialogContent>
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
                onChange={(e) => setEditData({...editData, amount: parseInt(e.target.value)})}
              />
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
    </div>
  );
}
