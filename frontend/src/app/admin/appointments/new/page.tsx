"use client";

import { useSearchParams } from "next/navigation";
import AppointmentForm from "@/components/appointments/AppointmentForm";

export default function AdminNewAppointmentPage() {
  const searchParams = useSearchParams();

  // 從 URL 參數獲取初始數據（用於聯絡轉換預約）
  const initialData = {
    name: searchParams.get('name') || '',
    email: searchParams.get('email') || '',
    phone: searchParams.get('phone') || '',
    branchId: searchParams.get('branchId') || '',
    notes: searchParams.get('notes') || '',
  };

  return (
    <AppointmentForm
      initialData={initialData}
      title="創建新預約"
      description="為客戶創建新的預約"
    />
  );
}