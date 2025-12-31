"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";
import { getUserRole, isBossRole } from "@/lib/access";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  status: string;
  createdAt: string;
  ownerArtistId?: string | null;
  ownerArtist?: { id: string; name?: string | null; phone?: string | null } | null;
  // Latest appointment reference (backend returns take:1 for deep-linking)
  appointments?: Array<{ id: string; createdAt: string }>;
  branch: {
    id: string;
    name: string;
    address: string;
    phone?: string;
  };
}

type AdminArtistApiRow = {
  id?: string;
  user?: { id?: string; name?: string | null } | null;
  branch?: { id?: string; name?: string | null } | null;
};

type ArtistOption = { userId: string; name: string; branchId: string; branchName: string };

type ListStatusFilter = 'ACTIVE' | 'CONVERTED' | 'CLOSED' | 'ALL';

interface ContactStats {
  total: number;
  pending: number;
  contacted: number;
  converted: number;
  closed: number;
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: '待處理', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'CONTACTED', label: '已聯繫', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'CONVERTED', label: '已轉換', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'CLOSED', label: '已關閉', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
];

export default function AdminContactsPage() {
  const router = useRouter();
  const role = getUserRole();
  const isBoss = isBossRole(role);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [ownerDraft, setOwnerDraft] = useState<Record<string, string>>({});
  const [listStatusFilter, setListStatusFilter] = useState<ListStatusFilter>('ACTIVE');

  useEffect(() => {
    const token = getAccessToken();
    console.log('Access token:', token ? 'Present' : 'Missing');
    if (!token) {
      router.replace("/login");
      return;
    }

    fetchContacts();
    fetchStats();

    if (isBoss) {
      fetchArtists();
    }
  }, [router]);

  const fetchContacts = async () => {
    try {
      console.log('Fetching contacts...');
      const data = await getJsonWithAuth<Contact[]>('/admin/contacts');
      console.log('Contacts data:', data);
      setContacts(data);
      setOwnerDraft((prev) => {
        const next = { ...prev };
        for (const c of data) {
          if (next[c.id] === undefined && (c.ownerArtistId || c.ownerArtist?.id)) {
            next[c.id] = (c.ownerArtistId || c.ownerArtist?.id || "") as string;
          }
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
      setError(`載入聯絡資料失敗: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtists = async () => {
    try {
      const data = await getJsonWithAuth<AdminArtistApiRow[]>("/admin/artists");
      const mapped: ArtistOption[] = (data || [])
        .map((a) => ({
          userId: String(a.user?.id || a.id || ""),
          name: String(a.user?.name || "未命名"),
          branchId: String(a.branch?.id || ""),
          branchName: String(a.branch?.name || "未分店"),
        }))
        .filter((a) => !!a.userId && !!a.branchId);
      setArtists(mapped);
    } catch (err) {
      console.warn("Failed to fetch artists for contact assignment", err);
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

  const assignOwnerArtist = async (contactId: string) => {
    const ownerArtistId = ownerDraft[contactId];
    if (!ownerArtistId) return;
    setUpdating(contactId);
    try {
      await patchJsonWithAuth(`/admin/contacts/${contactId}`, { ownerArtistId });
      await fetchContacts();
      await fetchStats();
    } catch (err) {
      const apiErr = err as ApiError;
      console.error('Failed to assign owner artist:', err);
      setError(apiErr.message || "指派刺青師失敗");
    } finally {
      setUpdating(null);
    }
  };

  const convertToAppointment = (contact: Contact) => {
    const params = new URLSearchParams({
      contactId: contact.id ?? "",
      // Keep basic fields for backward compatibility / faster perceived load,
      // but the appointment form will re-fetch contact detail by contactId (source of truth).
      name: contact.name ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      notes: contact.notes ?? "",
      branchId: contact.branch?.id ?? "",
    });
    router.push(`/admin/appointments/new?${params.toString()}`);
  };

  const viewConvertedAppointment = (contact: Contact) => {
    const apptId = contact.appointments?.[0]?.id;
    if (!apptId) {
      setError("此聯絡已轉換，但找不到對應的預約紀錄（可能是舊資料）。");
      return;
    }
    router.push(`/admin/appointments?openId=${encodeURIComponent(apptId)}`);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-muted-light dark:text-text-muted-dark">載入聯絡資料中...</p>
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

  const filteredContacts = contacts.filter((c) => {
    if (listStatusFilter === 'ALL') return true;
    if (listStatusFilter === 'CONVERTED') return c.status === 'CONVERTED';
    if (listStatusFilter === 'CLOSED') return c.status === 'CLOSED';
    // Default: ACTIVE (hide converted/closed to prevent duplicate conversions)
    return c.status === 'PENDING' || c.status === 'CONTACTED';
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 bg-white dark:bg-[var(--bg)] text-gray-900 dark:text-white">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center text-3xl font-bold text-gray-900 dark:text-text-primary-dark page-title">
              <MessageSquare className="mr-3 h-8 w-8" />
              管理聯絡通知
            </h1>
            <p className="mt-2 text-gray-600 dark:text-text-muted-dark page-subtitle">
              管理系統中的所有客戶聯絡資料
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex w-full items-center justify-center space-x-2 sm:w-auto action-btn-cancel"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>回上一頁</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總聯絡數</CardTitle>
              <MessageSquare className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待處理</CardTitle>
              <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已聯繫</CardTitle>
              <div className="h-4 w-4 rounded-full bg-blue-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.contacted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已轉換</CardTitle>
              <div className="h-4 w-4 rounded-full bg-green-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.converted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已關閉</CardTitle>
              <div className="h-4 w-4 rounded-full bg-gray-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.closed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 聯絡列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">聯絡列表</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted-light dark:text-text-muted-dark">顯示：</span>
              <select
                value={listStatusFilter}
                onChange={(e) => setListStatusFilter(e.target.value as ListStatusFilter)}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-900"
              >
                <option value="ACTIVE">進行中（待處理/已聯繫）</option>
                <option value="CONVERTED">已轉換</option>
                <option value="CLOSED">已關閉</option>
                <option value="ALL">全部</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider">
                  客戶資訊
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider">
                  分店
                </th>
                {isBoss && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider">
                    指派刺青師
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider">
                  建立時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => {
                const statusInfo = getStatusInfo(contact.status);
                const branchArtists = artists.filter((a) => a.branchId === contact.branch.id);
                const currentOwnerName = contact.ownerArtist?.name || (contact.ownerArtistId ? "（已指派）" : "未指派");
                return (
                  <tr key={contact.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{contact.name}</div>
                        <div className="text-sm text-text-muted-light dark:text-text-muted-dark">{contact.email}</div>
                        {contact.phone && (
                          <div className="text-sm text-text-muted-light dark:text-text-muted-dark">{contact.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-primary-light dark:text-text-primary-dark">{contact.branch.name}</div>
                      <div className="text-sm text-text-muted-light dark:text-text-muted-dark">{contact.branch.address}</div>
                    </td>
                    {isBoss && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-xs text-text-muted-light dark:text-text-muted-dark">
                            目前：{currentOwnerName}
                            {contact.ownerArtist?.phone ? `（${contact.ownerArtist.phone}）` : ""}
                          </div>
                          {branchArtists.length === 0 ? (
                            <div className="text-xs text-text-muted-light dark:text-text-muted-dark">
                              此分店無刺青師可指派
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                value={ownerDraft[contact.id] ?? ""}
                                onChange={(e) => setOwnerDraft((prev) => ({ ...prev, [contact.id]: e.target.value }))}
                                className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-900"
                                disabled={updating === contact.id}
                              >
                                <option value="">請選擇刺青師</option>
                                {branchArtists.map((a) => (
                                  <option key={a.userId} value={a.userId}>
                                    {a.name}（{a.branchName}）
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                onClick={() => assignOwnerArtist(contact.id)}
                                disabled={updating === contact.id || !ownerDraft[contact.id]}
                              >
                                {updating === contact.id ? "指派中..." : "指派"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted-light dark:text-text-muted-dark">
                      {formatDate(contact.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {contact.status === 'CONVERTED' ? (
                          <button
                            onClick={() => viewConvertedAppointment(contact)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            查看預約
                          </button>
                        ) : (
                          <button
                            onClick={() => convertToAppointment(contact)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            轉換為預約
                          </button>
                        )}
                        {contact.notes && (
                          <button
                            onClick={() => alert(`備註：${contact.notes}`)}
                            className="text-text-muted-light hover:text-text-primary-light dark:text-text-muted-dark dark:hover:text-text-secondary-dark"
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

        {filteredContacts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-text-muted-light dark:text-text-muted-dark">目前沒有聯絡資料</div>
          </div>
        )}
      </div>
    </div>
  );
}
