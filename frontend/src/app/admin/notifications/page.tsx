"use client";

import { useEffect, useMemo, useState } from "react";
import { getJsonWithAuth, patchJsonWithAuth, postJsonWithAuth } from "@/lib/api";
import { getUserRole, isBossRole } from "@/lib/access";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell,
  BellRing,
  Calendar,
  User,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "APPOINTMENT" | "MESSAGE" | "SYSTEM";
  isRead: boolean;
  createdAt: string;
  data?: {
    appointmentId?: string;
    appointmentStatus?: string;
    customerName?: string;
    serviceName?: string;
    appointmentTime?: string;
    contactId?: string;
    contactName?: string;
  };
}

type BranchOption = { id: string; name: string };
type AdminArtistApiRow = {
  id?: string;
  user?: { id?: string; name?: string | null; isActive?: boolean | null } | null;
  branch?: { id?: string; name?: string | null } | null;
};
type ArtistOption = { userId: string; name: string; branchId: string; branchName: string };

type AnnouncementHistoryRow = {
  dedupKey: string;
  title: string;
  message: string;
  createdAt: string;
  scope?: "ALL_ARTISTS" | "BRANCH_ARTISTS" | "SINGLE_ARTIST" | string;
  branchId?: string;
  artistId?: string;
  recipientCount: number;
};

export default function AdminNotificationsPage() {
  const router = useRouter();
  const role = getUserRole();
  const isBoss = isBossRole(role);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceScope, setAnnounceScope] = useState<"ALL_ARTISTS" | "BRANCH_ARTISTS" | "SINGLE_ARTIST">("ALL_ARTISTS");
  const [announceBranchId, setAnnounceBranchId] = useState<string>("");
  const [announceArtistId, setAnnounceArtistId] = useState<string>("");
  const [announceTitle, setAnnounceTitle] = useState<string>("");
  const [announceMessage, setAnnounceMessage] = useState<string>("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [announcementHistory, setAnnouncementHistory] = useState<AnnouncementHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<AnnouncementHistoryRow | null>(null);

  useEffect(() => {
    fetchNotifications();
    if (isBoss) {
      fetchAnnouncementTargets();
      fetchAnnouncementHistory();
    }
  }, []);

  const fetchAnnouncementTargets = async () => {
    try {
      const [branchData, artistData] = await Promise.all([
        getJsonWithAuth<BranchOption[]>("/admin/artists/branches"),
        getJsonWithAuth<AdminArtistApiRow[]>("/admin/artists"),
      ]);

      setBranches(
        (Array.isArray(branchData) ? branchData : [])
          .map((b) => ({ id: String((b as any).id || ""), name: String((b as any).name || "") }))
          .filter((b) => !!b.id),
      );

      const mapped: ArtistOption[] = (Array.isArray(artistData) ? artistData : [])
        .map((a) => ({
          userId: String(a.user?.id || a.id || ""),
          name: String(a.user?.name || "未命名"),
          branchId: String(a.branch?.id || ""),
          branchName: String(a.branch?.name || "未分店"),
        }))
        .filter((a) => !!a.userId && !!a.branchId);
      setArtists(mapped);
    } catch (e) {
      console.warn("Failed to fetch announcement targets", e);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth<Notification[]>("/artist/notifications");
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("載入通知失敗");
      console.error("Notifications fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(notificationId);
      await patchJsonWithAuth(`/artist/notifications/${notificationId}/read`, {});
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, isRead: true } : notif)),
      );
    } catch (err) {
      console.error("Mark as read error:", err);
      alert("標記已讀失敗");
    } finally {
      setMarkingAsRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.isRead);
      await Promise.all(
        unreadNotifications.map((notif) => patchJsonWithAuth(`/artist/notifications/${notif.id}/read`, {})),
      );
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
    } catch (err) {
      console.error("Mark all as read error:", err);
      alert("標記全部已讀失敗");
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return "剛剛";
    if (diffInHours < 24) return `${Math.floor(diffInHours)} 小時前`;
    if (diffInHours < 48) return "昨天";
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "APPOINTMENT":
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case "MESSAGE":
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      case "SYSTEM":
        return <BellRing className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5 text-text-muted-light" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "APPOINTMENT":
        return "border-l-blue-500 bg-blue-50";
      case "MESSAGE":
        return "border-l-green-500 bg-green-50";
      case "SYSTEM":
        return "border-l-purple-500 bg-purple-50";
      default:
        return "border-l-gray-500 bg-gray-50";
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "APPOINTMENT":
        return "預約通知";
      case "MESSAGE":
        return "訊息通知";
      case "SYSTEM":
        return "系統通知";
      default:
        return "通知";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "待確認";
      case "CONFIRMED":
        return "已確認";
      case "IN_PROGRESS":
        return "進行中";
      case "COMPLETED":
        return "已完成";
      case "CANCELED":
        return "已取消";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-purple-100 text-purple-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-text-primary-light";
    }
  };

  const fetchAnnouncementHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await getJsonWithAuth<AnnouncementHistoryRow[]>("/admin/notifications/announcements?limit=50");
      setAnnouncementHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Failed to fetch announcement history", e);
      setAnnouncementHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatScopeLabel = (row: AnnouncementHistoryRow) => {
    if (row.scope === "ALL_ARTISTS") return "所有 ARTIST";
    if (row.scope === "BRANCH_ARTISTS") {
      const b = branches.find((x) => x.id === row.branchId);
      return `分店：${b?.name || row.branchId || "未知"}`;
    }
    if (row.scope === "SINGLE_ARTIST") {
      const a = artists.find((x) => x.userId === row.artistId);
      return `刺青師：${a ? `${a.name}（${a.branchName}）` : row.artistId || "未知"}`;
    }
    return row.scope ? String(row.scope) : "未知";
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const hasAnyContactLink = useMemo(
    () => notifications.some((n) => !!(n as any)?.data?.contactId),
    [notifications],
  );

  const sendAnnouncement = async () => {
    if (!announceTitle.trim() || !announceMessage.trim()) {
      alert("請輸入公告標題與內容");
      return;
    }
    if (announceScope === "BRANCH_ARTISTS" && !announceBranchId) {
      alert("請選擇分店");
      return;
    }
    if (announceScope === "SINGLE_ARTIST" && !announceArtistId) {
      alert("請選擇刺青師");
      return;
    }

    try {
      setSendingAnnouncement(true);
      const res = await postJsonWithAuth<{ createdCount: number }>(`/admin/notifications/broadcast`, {
        scope: announceScope,
        branchId: announceScope === "BRANCH_ARTISTS" ? announceBranchId : undefined,
        artistId: announceScope === "SINGLE_ARTIST" ? announceArtistId : undefined,
        title: announceTitle.trim(),
        message: announceMessage.trim(),
      });
      alert(`已發送公告（建立 ${res?.createdCount ?? 0} 則通知）`);
      setAnnounceOpen(false);
      setAnnounceTitle("");
      setAnnounceMessage("");
      setAnnounceScope("ALL_ARTISTS");
      setAnnounceBranchId("");
      setAnnounceArtistId("");
      // Refresh history so BOSS can see it immediately
      fetchAnnouncementHistory();
    } catch (e) {
      console.error("Failed to send announcement", e);
      alert("發送公告失敗");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-text-muted-light">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchNotifications} className="mt-4">
            重新載入
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary-light">通知中心</h1>
          <p className="text-text-muted-light mt-2">您有 {unreadCount} 則未讀通知</p>
        </div>

        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
          {isBoss && (
            <>
              <Button onClick={() => setAnnounceOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
                <BellRing className="mr-2 h-4 w-4" />
                發送系統公告
              </Button>
              <Dialog open={announceOpen} onOpenChange={setAnnounceOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>發送系統公告（BOSS）</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>範圍</Label>
                      <Select value={announceScope} onValueChange={(v: any) => setAnnounceScope(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇範圍" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL_ARTISTS">群發所有 ARTIST</SelectItem>
                          <SelectItem value="BRANCH_ARTISTS">針對分店的 ARTIST</SelectItem>
                          <SelectItem value="SINGLE_ARTIST">針對單一 ARTIST</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {announceScope === "BRANCH_ARTISTS" && (
                      <div className="space-y-2">
                        <Label>分店</Label>
                        <Select value={announceBranchId} onValueChange={setAnnounceBranchId}>
                          <SelectTrigger>
                            <SelectValue placeholder="選擇分店" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {announceScope === "SINGLE_ARTIST" && (
                      <div className="space-y-2">
                        <Label>刺青師</Label>
                        <Select value={announceArtistId} onValueChange={setAnnounceArtistId}>
                          <SelectTrigger>
                            <SelectValue placeholder="選擇刺青師" />
                          </SelectTrigger>
                          <SelectContent>
                            {artists.map((a) => (
                              <SelectItem key={a.userId} value={a.userId}>
                                {a.name}（{a.branchName}）
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>標題</Label>
                      <Input value={announceTitle} onChange={(e) => setAnnounceTitle(e.target.value)} placeholder="公告標題" />
                    </div>
                    <div className="space-y-2">
                      <Label>內容</Label>
                      <Textarea
                        value={announceMessage}
                        onChange={(e) => setAnnounceMessage(e.target.value)}
                        placeholder="公告內容"
                        rows={5}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setAnnounceOpen(false)} disabled={sendingAnnouncement}>
                        取消
                      </Button>
                      <Button onClick={sendAnnouncement} disabled={sendingAnnouncement}>
                        {sendingAnnouncement ? "發送中..." : "發送"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              <CheckCircle className="mr-2 h-4 w-4" />
              全部標記為已讀
            </Button>
          )}
        </div>
      </div>

      {isBoss && (
        <Card>
          <CardHeader>
            <CardTitle>歷史系統公告</CardTitle>
            <CardDescription>查看過去發送的公告（含範圍與送達數量）</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="text-sm text-text-muted-light">載入中...</div>
            ) : announcementHistory.length === 0 ? (
              <div className="text-sm text-text-muted-light">尚無公告紀錄</div>
            ) : (
              <div className="space-y-2">
                {announcementHistory.map((row) => (
                  <button
                    key={row.dedupKey}
                    className="w-full text-left rounded-lg border border-gray-200 dark:border-neutral-700 p-3 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                    onClick={() => setSelectedHistory(row)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-text-primary-light truncate">{row.title}</div>
                        <div className="text-sm text-text-muted-light truncate">{row.message}</div>
                        <div className="mt-1 text-xs text-text-muted-light">
                          {new Date(row.createdAt).toLocaleString("zh-TW")} · {formatScopeLabel(row)}
                        </div>
                      </div>
                      <div className="text-sm text-text-primary-light whitespace-nowrap">
                        送達 {row.recipientCount}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <Dialog open={!!selectedHistory} onOpenChange={(open) => (!open ? setSelectedHistory(null) : null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>公告詳情</DialogTitle>
                </DialogHeader>
                {selectedHistory && (
                  <div className="space-y-3">
                    <div className="text-sm text-text-muted-light">
                      {new Date(selectedHistory.createdAt).toLocaleString("zh-TW")} · {formatScopeLabel(selectedHistory)} · 送達{" "}
                      {selectedHistory.recipientCount}
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary-light">{selectedHistory.title}</div>
                      <div className="mt-2 whitespace-pre-wrap text-text-secondary-light">{selectedHistory.message}</div>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => setSelectedHistory(null)}>
                        關閉
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="h-16 w-16 text-text-muted-light mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary-light mb-2">沒有通知</h3>
            <p className="text-text-muted-light">您目前沒有任何通知</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`border-l-4 ${getNotificationColor(notification.type)} ${
                !notification.isRead ? "ring-2 ring-blue-200" : ""
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getNotificationIcon(notification.type)}
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-text-primary-light">{notification.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {getTypeText(notification.type)}
                        </Badge>
                        {!notification.isRead && (
                          <Badge className="bg-blue-600 text-white text-xs">未讀</Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-text-secondary-light mb-3">{notification.message}</p>

                    {(notification.data?.contactId || notification.data?.appointmentId) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {notification.data?.contactId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(`/admin/contacts?highlightId=${encodeURIComponent(notification.data!.contactId!)}`)
                            }
                          >
                            查看聯絡
                          </Button>
                        )}
                        {notification.data?.appointmentId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(
                                `/admin/appointments?openId=${encodeURIComponent(notification.data!.appointmentId!)}`,
                              )
                            }
                          >
                            查看預約
                          </Button>
                        )}
                      </div>
                    )}

                    {notification.type === "APPOINTMENT" && notification.data && (
                      <div className="bg-white rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {notification.data.customerName && (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-text-muted-light" />
                              <span className="text-text-muted-light">顧客：{notification.data.customerName}</span>
                            </div>
                          )}
                          {notification.data.serviceName && (
                            <div className="flex items-center space-x-2">
                              <Info className="h-4 w-4 text-text-muted-light" />
                              <span className="text-text-muted-light">服務：{notification.data.serviceName}</span>
                            </div>
                          )}
                          {notification.data.appointmentTime && (
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-text-muted-light" />
                              <span className="text-text-muted-light">
                                時間：{new Date(notification.data.appointmentTime).toLocaleString("zh-TW")}
                              </span>
                            </div>
                          )}
                          {notification.data.appointmentStatus && (
                            <div className="flex items-center space-x-2">
                              <span className="text-text-muted-light">狀態：</span>
                              <Badge className={getStatusColor(notification.data.appointmentStatus)}>
                                {getStatusText(notification.data.appointmentStatus)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-muted-light">{formatDateTime(notification.createdAt)}</span>
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsRead(notification.id)}
                          disabled={markingAsRead === notification.id}
                        >
                          {markingAsRead === notification.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          標記已讀
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


