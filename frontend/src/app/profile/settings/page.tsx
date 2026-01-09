"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Palette, Eye, Shield } from "lucide-react";

export default function ProfileSettingsPage() {
  const [notifications, setNotifications] = useState({
    email: false,
    line: false,
    app: false,
  });

  const [privacy, setPrivacy] = useState({
    showFavorites: true,
    showReviews: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">設定中心</h2>
        <p className="text-gray-600">管理您的通知、偏好和隱私設定</p>
      </div>

      {/* 通知設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>通知設定</CardTitle>
              <CardDescription>選擇接收通知的方式</CardDescription>
            </div>
            <Badge variant="secondary" className="ml-auto">
              即將推出
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-500">
            目前版本尚未開放通知功能（Email / LINE / App 推播），敬請期待。
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notif">Email 通知</Label>
              <p className="text-sm text-gray-500">接收預約提醒和促銷訊息</p>
            </div>
            <Switch
              id="email-notif"
              checked={notifications.email}
              disabled
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="line-notif">LINE 通知</Label>
              <p className="text-sm text-gray-500">透過 LINE 接收訊息</p>
            </div>
            <Switch
              id="line-notif"
              checked={notifications.line}
              disabled
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="app-notif">App 推播</Label>
              <p className="text-sm text-gray-500">接收 App 推播通知</p>
            </div>
            <Switch
              id="app-notif"
              checked={notifications.app}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* 隱私設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>隱私設定</CardTitle>
              <CardDescription>控制其他人可以看到的資訊</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-favorites">公開收藏作品</Label>
              <p className="text-sm text-gray-500">讓其他人看到您的收藏</p>
            </div>
            <Switch
              id="show-favorites"
              checked={privacy.showFavorites}
              onCheckedChange={(checked) =>
                setPrivacy({ ...privacy, showFavorites: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-reviews">公開我的評價</Label>
              <p className="text-sm text-gray-500">讓其他人看到您的評論</p>
            </div>
            <Switch
              id="show-reviews"
              checked={privacy.showReviews}
              onCheckedChange={(checked) =>
                setPrivacy({ ...privacy, showReviews: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 個人偏好 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>個人偏好</CardTitle>
              <CardDescription>設定您的刺青風格偏好</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            此功能將在未來版本中提供，用於 AI 推薦合適的作品和師傅
          </p>
        </CardContent>
      </Card>

      {/* 儲存按鈕 */}
      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700" disabled>
          儲存設定
        </Button>
      </div>
    </div>
  );
}

