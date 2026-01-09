"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Smartphone, AlertTriangle } from "lucide-react";
import { patchJsonWithAuth } from "@/lib/api";

export default function ProfileSecurityPage() {
  const [changing, setChanging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const handleChangePassword = async () => {
    // 驗證
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setError("請填寫所有欄位");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setError("新密碼與確認密碼不符");
      return;
    }
    if (passwords.new.length < 6) {
      setError("新密碼至少需要 6 個字元");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await patchJsonWithAuth("/users/me/password", {
        oldPassword: passwords.current,
        newPassword: passwords.new,
      });
      setSuccess("密碼修改成功");
      setChanging(false);
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err: any) {
      setError(err?.message || "密碼修改失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">安全與隱私</h2>
        <p className="text-gray-600">管理您的帳號安全設定</p>
      </div>

      {/* 修改密碼 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>修改密碼</CardTitle>
              <CardDescription>定期更新密碼以保護帳號安全</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
              {success}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}
          {!changing ? (
            <Button
              variant="outline"
              onClick={() => {
                setChanging(true);
                setError(null);
                setSuccess(null);
              }}
            >
              修改密碼
            </Button>
          ) : (
            <>
              <div>
                <Label htmlFor="current-password">目前密碼</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  placeholder="請輸入目前密碼"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="new-password">新密碼</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  placeholder="請輸入新密碼"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">確認新密碼</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder="請再次輸入新密碼"
                  disabled={loading}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setChanging(false);
                    setPasswords({ current: "", new: "", confirm: "" });
                    setError(null);
                    setSuccess(null);
                  }}
                  disabled={loading}
                >
                  取消
                </Button>
                <Button
                  onClick={handleChangePassword}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? "處理中..." : "確認修改"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 登入裝置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>登入裝置</CardTitle>
              <CardDescription>查看最近登入的裝置和位置</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">目前裝置</div>
                <div className="text-sm text-gray-500">Chrome • 台灣</div>
              </div>
              <Badge className="bg-green-100 text-green-800">使用中</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 帳號綁定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>帳號綁定</CardTitle>
              <CardDescription>連結第三方帳號以便快速登入</CardDescription>
            </div>
            <Badge variant="secondary" className="ml-auto">
              即將推出
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-500">
            目前版本尚未開放第三方帳號綁定（LINE / Google），敬請期待。
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">
                L
              </div>
              <div>
                <div className="font-medium">LINE</div>
                <div className="text-sm text-gray-500">尚未綁定</div>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              綁定
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                G
              </div>
              <div>
                <div className="font-medium">Google</div>
                <div className="text-sm text-gray-500">尚未綁定</div>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              綁定
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 危險區域 */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <CardTitle className="text-red-700">危險區域</CardTitle>
              <CardDescription>這些操作無法復原，請謹慎操作</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">匯出個人資料</div>
              <div className="text-sm text-gray-500">下載您在系統中的所有資料</div>
            </div>
            <Button variant="outline" size="sm">
              匯出資料
            </Button>
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <div className="font-medium text-red-700">刪除帳號</div>
              <div className="text-sm text-gray-500">永久刪除您的帳號和所有資料</div>
            </div>
            <Button variant="destructive" size="sm">
              刪除帳號
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

