"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getJsonWithAuth, getAccessToken, patchJsonWithAuth } from "@/lib/api";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, X, CheckCircle, AlertCircle } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  role: string;
  createdAt: string;
}

interface Member {
  userId: string;
  membershipLevel: string;
  totalSpent: number;
  balance: number;
  lastLoginAt?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push("/login?redirect=/profile");
      return;
    }

    fetchProfile();
  }, [router]);

  const fetchProfile = async () => {
    try {
      const userData = await getJsonWithAuth("/users/me");
      setUser(userData as User);
      setFormData({
        name: (userData as User).name || "",
        phone: (userData as User).phone || "",
      });

      // 獲取會員資料
      try {
        const memberData = await getJsonWithAuth(`/members/${(userData as User).id}`);
        setMember(memberData as Member);
      } catch (err) {
        console.error("獲取會員資料失敗:", err);
      }
    } catch (error) {
      console.error("獲取個人資料失敗:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      await patchJsonWithAuth(`/users/${user.id}`, formData);
      setMessage({ type: "success", text: "✅ 個人資料已更新" });
      setEditing(false);
      await fetchProfile();

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("更新失敗:", error);
      setMessage({ type: "error", text: "❌ 更新失敗，請重試" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
    setEditing(false);
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (!user || !member) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 個人資料頭部 */}
      <ProfileHeader user={user} member={member} />

      {/* 訊息提示 */}
      {message && (
        <div
          className={cn(
            "flex items-center gap-2 p-4 rounded-lg border",
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 基本資料卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>基本資料</CardTitle>
            {!editing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                編輯
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "儲存中..." : "儲存"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 姓名 */}
          <div>
            <Label>姓名</Label>
            {editing ? (
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="請輸入姓名"
              />
            ) : (
              <div className="text-gray-900 font-medium mt-1">{user.name}</div>
            )}
          </div>

          {/* 電子郵件 */}
          <div>
            <Label>電子郵件</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-gray-900">{user.email}</div>
              <Badge variant="outline" className="text-xs">
                已驗證
              </Badge>
            </div>
          </div>

          {/* 手機號碼 */}
          <div>
            <Label>手機號碼</Label>
            {editing ? (
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="請輸入手機號碼"
              />
            ) : (
              <div className="text-gray-900 mt-1">{user.phone || "未設定"}</div>
            )}
          </div>

          {/* 會員編號 */}
          <div>
            <Label>會員編號</Label>
            <div className="text-gray-900 font-mono mt-1">
              {user.id.slice(0, 12).toUpperCase()}
            </div>
          </div>

          {/* 註冊日期 */}
          <div>
            <Label>註冊日期</Label>
            <div className="text-gray-900 mt-1">
              {new Date(user.createdAt).toLocaleDateString("zh-TW", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>

          {/* 最後登入 */}
          {member.lastLoginAt && (
            <div>
              <Label>最後登入時間</Label>
              <div className="text-gray-900 mt-1">
                {new Date(member.lastLoginAt).toLocaleString("zh-TW")}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 會員統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">會員級別</div>
            <div className="text-2xl font-bold text-gray-900">{membership.label}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">累計消費</div>
            <div className="text-2xl font-bold text-blue-600">
              NT$ {member.totalSpent.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">帳戶餘額</div>
            <div className="text-2xl font-bold text-green-600">
              NT$ {member.balance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
