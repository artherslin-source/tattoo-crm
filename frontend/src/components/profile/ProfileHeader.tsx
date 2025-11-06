"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Camera, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  membershipLevel: string;
  totalSpent: number;
  balance: number;
}

interface ProfileHeaderProps {
  user: User;
  member: Member;
  onAvatarUpload?: () => void;
}

const membershipLabels: Record<string, { label: string; color: string }> = {
  BRONZE: { label: "一般會員", color: "bg-amber-100 text-amber-800" },
  SILVER: { label: "銀卡會員", color: "bg-gray-100 text-gray-800" },
  GOLD: { label: "金卡會員", color: "bg-yellow-100 text-yellow-800" },
  PLATINUM: { label: "白金會員", color: "bg-purple-100 text-purple-800" },
  VIP: { label: "VIP 會員", color: "bg-blue-100 text-blue-800" },
  FLAGSHIP: { label: "旗艦會員", color: "bg-red-100 text-red-800" },
};

export function ProfileHeader({ user, member, onAvatarUpload }: ProfileHeaderProps) {
  const membership = membershipLabels[member.membershipLevel] || membershipLabels.BRONZE;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-8 text-white">
      <div className="flex items-start gap-6">
        {/* 頭像 */}
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-white/20 border-4 border-white/30">
            {user.photoUrl ? (
              <Image
                src={user.photoUrl}
                alt={user.name}
                width={96}
                height={96}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {onAvatarUpload && (
            <button
              onClick={onAvatarUpload}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* 基本資訊 */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <Badge className={cn("text-xs", membership.color)}>
              <Award className="h-3 w-3 mr-1" />
              {membership.label}
            </Badge>
          </div>
          <p className="text-blue-100 mb-4">{user.email}</p>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-blue-100 text-xs">累計消費</div>
              <div className="text-xl font-semibold">NT$ {member.totalSpent.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-blue-100 text-xs">帳戶餘額</div>
              <div className="text-xl font-semibold">NT$ {member.balance.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-blue-100 text-xs">會員編號</div>
              <div className="text-sm font-mono">{user.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

