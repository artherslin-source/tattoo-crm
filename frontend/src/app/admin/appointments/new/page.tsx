import AppointmentForm from "@/components/appointments/AppointmentForm";

export default async function NewAppointmentPage({ searchParams }: any) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">建立新預約</h1>
      <AppointmentForm fromContact={searchParams} data-testid="appointment-form" />
    </div>
  );
}
