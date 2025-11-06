"use client";

import { useEffect, useState } from "react";
import { getJsonWithAuth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  type: string;
  orderId: string;
}

const paymentTypeLabels: Record<string, string> = {
  DEPOSIT: "訂金",
  FINAL: "尾款",
  FULL: "全額付款",
  INSTALLMENT: "分期付款",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

export default function ProfilePaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      // TODO: 實現付款記錄 API
      // const data = await getJsonWithAuth("/payments/my");
      // setPayments(data || []);
      setPayments([]);
    } catch (error) {
      console.error("獲取付款記錄失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">我的付款記錄</h2>
        <p className="text-gray-600">查看您的付款明細和收據</p>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">尚無付款記錄</h3>
            <p className="text-gray-600">
              完成預約並付款後，記錄會顯示在這裡
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card key={payment.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {paymentTypeLabels[payment.type]}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {new Date(payment.paymentDate).toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                  </div>
                  <Badge className={statusColors[payment.status]}>
                    {payment.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">付款金額</div>
                    <div className="text-2xl font-bold text-blue-600">
                      NT$ {payment.amount.toLocaleString()}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    下載收據
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

