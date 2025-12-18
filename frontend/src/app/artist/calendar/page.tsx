"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getJsonWithAuth, ApiError } from "@/lib/api";
import { getAccessToken, getUserRole, isArtistRole } from "@/lib/access";
import ArtistWeekCalendar, { type CalendarAppointment } from "@/components/calendar/ArtistWeekCalendar";

type BranchBusinessHoursResponse = {
  branch: {
    id: string;
    name: string;
    businessHours: unknown;
  };
};

function startOfWeekMonday(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Mon=0
  date.setDate(date.getDate() - diff);
  return date;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export default function ArtistCalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(new Date()));
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const [branch, setBranch] = useState<BranchBusinessHoursResponse["branch"] | null>(null);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);

  const ensureAuthorized = useCallback(() => {
    const token = getAccessToken();
    const role = getUserRole();
    if (!token || !isArtistRole(role)) {
      router.replace("/login?redirect=/artist/calendar");
      return false;
    }
    return true;
  }, [router]);

  const fetchBusinessHours = useCallback(async () => {
    const data = (await getJsonWithAuth("/branch/business-hours")) as BranchBusinessHoursResponse;
    setBranch(data.branch);
  }, []);

  const fetchAppointments = useCallback(
    async (rangeStart: Date, rangeEnd: Date) => {
      const params = new URLSearchParams();
      params.set("startDate", rangeStart.toISOString());
      params.set("endDate", rangeEnd.toISOString());
      const data = (await getJsonWithAuth(`/artist/appointments/range?${params.toString()}`)) as CalendarAppointment[];
      setAppointments(Array.isArray(data) ? data : []);
    },
    [],
  );

  const refresh = useCallback(async () => {
    setError(null);
    if (!ensureAuthorized()) return;
    setLoading(true);
    try {
      await Promise.all([fetchBusinessHours(), fetchAppointments(weekStart, weekEnd)]);
    } catch (e) {
      const err = e as ApiError;
      setError(err?.message || "載入行程失敗");
    } finally {
      setLoading(false);
    }
  }, [ensureAuthorized, fetchAppointments, fetchBusinessHours, weekEnd, weekStart]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">週行程日曆</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setWeekStart((d) => addDays(d, -7))}>
              上一週
            </Button>
            <Button variant="outline" onClick={() => setWeekStart(startOfWeekMonday(new Date()))}>
              本週
            </Button>
            <Button variant="outline" onClick={() => setWeekStart((d) => addDays(d, 7))}>
              下一週
            </Button>
            <Button onClick={refresh} disabled={loading}>
              重新整理
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="text-sm text-red-600 mb-3">{error}</div> : null}
          <ArtistWeekCalendar
            loading={loading}
            weekStart={weekStart}
            businessHours={branch?.businessHours ?? null}
            appointments={appointments}
            onRefresh={refresh}
            onWeekStartChange={(next) => setWeekStart(next)}
          />
        </CardContent>
      </Card>
    </div>
  );
}


