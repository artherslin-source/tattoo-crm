import AppointmentForm from "@/components/appointments/AppointmentForm";

export default async function NewAppointmentPage({ searchParams }: any) {
  // ✅ 等待 async component 被解析（避免 JSX 直接渲染 Promise）
  const Form = await AppointmentForm({ fromContact: searchParams });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">建立新預約</h1>
      {Form}
    </div>
  );
}
