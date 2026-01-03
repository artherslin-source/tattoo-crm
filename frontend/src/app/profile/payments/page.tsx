"use client";

import { useEffect, useState } from "react";
import { getJsonWithAuth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BillPayment {
  id: string;
  amount: number;
  method: string;
  paidAt: string;
  notes?: string | null;
}

interface BillRow {
  id: string;
  billType: string;
  status: "OPEN" | "SETTLED" | "VOID" | string;
  currency: string;
  billTotal: number;
  discountTotal: number;
  createdAt: string;
  branch: { id: string; name: string } | null;
  artist: { id: string; name: string | null } | null;
  payments: BillPayment[];
  summary: { paidTotal: number; dueTotal: number };
}

const billTypeLabels: Record<string, string> = {
  APPOINTMENT: "預約",
  WALK_IN: "現場",
  OTHER: "其他",
  STORED_VALUE_TOPUP: "儲值",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  SETTLED: "bg-green-100 text-green-800",
  VOID: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  OPEN: "未結清",
  SETTLED: "已結清",
  VOID: "作廢",
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "現金",
  CARD: "刷卡",
  TRANSFER: "轉帳",
  STORED_VALUE: "儲值金",
  OTHER: "其他",
};

export default function ProfilePaymentsPage() {
  const [bills, setBills] = useState<BillRow[]>([]);
  const [expandedBillIds, setExpandedBillIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const data = await getJsonWithAuth<BillRow[]>("/users/me/bills");
      setBills(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("獲取付款記錄失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (billId: string) => {
    setExpandedBillIds((prev) => ({ ...prev, [billId]: !prev[billId] }));
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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

      {bills.length === 0 ? (
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
          {bills.map((bill) => {
            const expanded = !!expandedBillIds[bill.id];
            const statusColor = statusColors[bill.status] || "bg-gray-100 text-gray-800";
            const statusLabel = statusLabels[bill.status] || bill.status;
            const billTypeLabel = billTypeLabels[bill.billType] || bill.billType;
            return (
              <Card key={bill.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">
                        {billTypeLabel}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {formatDateTime(bill.createdAt)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          分店：{bill.branch?.name || "—"}
                        </div>
                        <div className="text-sm text-gray-600">
                          刺青師：{bill.artist?.name || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={statusColor}>{statusLabel}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpanded(bill.id)}
                      >
                        {expanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            收合
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            明細
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-sm text-gray-600">帳單金額</div>
                      <div className="text-xl font-bold text-gray-900">
                        NT$ {bill.billTotal.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">已付</div>
                      <div className="text-xl font-bold text-blue-600">
                        NT$ {bill.summary.paidTotal.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">未付</div>
                      <div className="text-xl font-bold text-gray-900">
                        NT$ {Math.max(0, bill.summary.dueTotal).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="rounded-md border border-gray-200">
                      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-900">
                        付款明細
                      </div>
                      {bill.payments.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-gray-600">
                          尚無付款紀錄
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {bill.payments.map((p) => (
                            <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm text-gray-900">
                                  {formatDateTime(p.paidAt)}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  方式：{paymentMethodLabels[p.method] || p.method}
                                  {p.notes ? `｜備註：${p.notes}` : ""}
                                </div>
                              </div>
                              <div className={`text-sm font-semibold ${p.amount >= 0 ? "text-green-700" : "text-red-700"}`}>
                                {p.amount >= 0 ? "+" : "-"}NT$ {Math.abs(p.amount).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

