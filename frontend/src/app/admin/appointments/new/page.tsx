"use client";

import AppointmentForm from "@/components/appointments/AppointmentForm";
import { useSearchParams } from "next/navigation";

export default function NewAppointmentPage() {
  const searchParams = useSearchParams();
  const fromContactParam = searchParams.get("fromContact");
  
  // 將 fromContact 字符串轉換為對象
  const fromContact = fromContactParam ? JSON.parse(fromContactParam) : undefined;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">建立新預約</h1>
      <AppointmentForm fromContact={fromContact} />
    </div>
  );
}
