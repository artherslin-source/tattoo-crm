"use client";

import { useEffect, useState } from "react";
import { getJsonWithAuth } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  Users
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalAppointments: number;
  totalSpent: number;
  lastVisit: string;
  appointments: {
    id: string;
    startAt: string;
    status: string;
    service: {
      name: string;
      price: number;
    };
    notes?: string;
  }[];
}

export default function ArtistCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // 搜尋功能
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth('/artist/customers');
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (err) {
      setError('載入顧客資料失敗');
      console.error('Customers fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-purple-100 text-purple-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '待確認';
      case 'CONFIRMED':
        return '已確認';
      case 'IN_PROGRESS':
        return '進行中';
      case 'COMPLETED':
        return '已完成';
      case 'CANCELED':
        return '已取消';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchCustomers} className="mt-4">
            重新載入
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">顧客資訊</h1>
        <p className="text-gray-600 mt-2">查看您服務過的顧客資料和歷史記錄</p>
      </div>

      {/* 搜尋欄 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="搜尋顧客姓名、電話或信箱..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 顧客列表 */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? '找不到符合條件的顧客' : '沒有顧客資料'}
            </h3>
            <p className="text-gray-500">
              {searchTerm ? '請嘗試其他搜尋關鍵字' : '您還沒有服務過任何顧客'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pt-6 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-500" />
                    <CardTitle className="text-lg font-semibold">
                      {customer.name}
                    </CardTitle>
                  </div>
                  <Badge variant="outline">
                    {customer.totalAppointments} 次服務
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{customer.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>最後服務：{formatDate(customer.lastVisit)}</span>
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      <span className="text-gray-600">總消費：</span>
                      <span className="font-medium text-green-600">
                        NT$ {(customer.totalSpent || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setSelectedCustomer(customer)}
                    className="ml-4"
                  >
                    查看詳情
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 顧客詳情 Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCustomer.name} 的詳細資料
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setSelectedCustomer(null)}
                >
                  關閉
                </Button>
              </div>

              {/* 基本資料 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>基本資料</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">姓名</label>
                      <p className="text-gray-900">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">電話</label>
                      <p className="text-gray-900">{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">信箱</label>
                      <p className="text-gray-900">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">總服務次數</label>
                      <p className="text-gray-900">{selectedCustomer.totalAppointments} 次</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">總消費金額</label>
                      <p className="text-gray-900 font-medium text-green-600">
                        NT$ {(selectedCustomer.totalSpent || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">最後服務日期</label>
                      <p className="text-gray-900">{formatDate(selectedCustomer.lastVisit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 服務歷史 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>服務歷史</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCustomer.appointments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">沒有服務記錄</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedCustomer.appointments.map((appointment) => (
                        <div key={appointment.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              {appointment.service.name}
                            </h4>
                            <Badge className={getStatusColor(appointment.status)}>
                              {getStatusText(appointment.status)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDateTime(appointment.startAt)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-green-600">
                                NT$ {appointment.service.price.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {appointment.notes && (
                            <div className="mt-2">
                              <label className="text-sm font-medium text-gray-700">備註</label>
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                                {appointment.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
