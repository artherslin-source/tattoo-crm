"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  status: string;
  createdAt: string;
  branch: {
    id: string;
    name: string;
    address: string;
    phone?: string;
  };
}

interface ContactStats {
  total: number;
  pending: number;
  contacted: number;
  converted: number;
  closed: number;
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: '待處理', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'CONTACTED', label: '已聯繫', color: 'bg-blue-100 text-blue-800' },
  { value: 'CONVERTED', label: '已轉換', color: 'bg-green-100 text-green-800' },
  { value: 'CLOSED', label: '已關閉', color: 'bg-gray-100 text-gray-800' },
];

export default function AdminContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    console.log('Access token:', token ? 'Present' : 'Missing');
    if (!token) {
      router.replace("/login");
      return;
    }

    fetchContacts();
    fetchStats();
  }, [router]);

  const fetchContacts = async () => {
    try {
      console.log('Fetching contacts...');
      const data = await getJsonWithAuth<Contact[]>('/admin/contacts');
      console.log('Contacts data:', data);
      setContacts(data);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
      setError(`載入聯絡資料失敗: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('Fetching stats...');
      const data = await getJsonWithAuth<ContactStats>('/admin/contacts/stats');
      console.log('Stats data:', data);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError(`載入統計資料失敗: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const updateContactStatus = async (contactId: string, newStatus: string) => {
    setUpdating(contactId);
    try {
      await patchJsonWithAuth(`/admin/contacts/${contactId}`, { status: newStatus });
      
      // 更新本地狀態
      setContacts(prev => prev.map(contact => 
        contact.id === contactId ? { ...contact, status: newStatus } : contact
      ));
      
      // 重新載入統計資料
      fetchStats();
    } catch (err) {
      console.error('Failed to update contact status:', err);
      setError('更新狀態失敗');
    } finally {
      setUpdating(null);
    }
  };

  const convertToAppointment = (contact: Contact) => {
    router.push(
      `/admin/appointments/new?contactId=${contact.id}&name=${encodeURIComponent(contact.name)}&email=${encodeURIComponent(contact.email)}&phone=${encodeURIComponent(contact.phone || '')}&notes=${encodeURIComponent(contact.notes || '')}&branchId=${contact.branch.id}`
    );
  };

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find(option => option.value === status) || STATUS_OPTIONS[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchContacts();
              fetchStats();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">聯絡管理</h1>
          <p className="text-gray-600 mt-2">管理客戶聯絡資料和轉換流程</p>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">總聯絡數</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">待處理</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-blue-600">{stats.contacted}</div>
              <div className="text-sm text-gray-600">已聯繫</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
              <div className="text-sm text-gray-600">已轉換</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
              <div className="text-sm text-gray-600">已關閉</div>
            </div>
          </div>
        )}

        {/* 聯絡列表 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">聯絡列表</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    客戶資訊
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    分店
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    建立時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => {
                  const statusInfo = getStatusInfo(contact.status);
                  return (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                          <div className="text-sm text-gray-500">{contact.email}</div>
                          {contact.phone && (
                            <div className="text-sm text-gray-500">{contact.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{contact.branch.name}</div>
                        <div className="text-sm text-gray-500">{contact.branch.address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={contact.status}
                          onChange={(e) => updateContactStatus(contact.id, e.target.value)}
                          disabled={updating === contact.id}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${statusInfo.color} ${
                            updating === contact.id ? 'opacity-50' : 'cursor-pointer'
                          }`}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(contact.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => convertToAppointment(contact)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            轉換為預約
                          </button>
                          {contact.notes && (
                            <button
                              onClick={() => alert(`備註：${contact.notes}`)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              查看備註
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {contacts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">目前沒有聯絡資料</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
