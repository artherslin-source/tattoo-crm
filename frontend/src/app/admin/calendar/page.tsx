"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getJsonWithAuth, ApiError } from "@/lib/api";
import { getAccessToken, getUserRole, isArtistRole } from "@/lib/access";
import ArtistWeekCalendar, { type CalendarAppointment } from "@/components/calendar/ArtistWeekCalendar";
import { Switch } from "@/components/ui/switch";

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

export default function AdminArtistCalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking24hEnabled, setBooking24hEnabled] = useState(false);
  const [show24h, setShow24h] = useState(false);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(new Date()));
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const [branch, setBranch] = useState<BranchBusinessHoursResponse["branch"] | null>(null);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);

  const ensureAuthorized = useCallback(() => {
    const token = getAccessToken();
    const role = getUserRole();
    if (!token || !isArtistRole(role)) {
      router.replace("/login?redirect=/admin/calendar");
      return false;
    }
    return true;
  }, [router]);

  const fetchBusinessHours = useCallback(async () => {
    const data = (await getJsonWithAuth("/branch/business-hours")) as BranchBusinessHoursResponse;
    setBranch(data.branch);
  }, []);

  const fetchMe = useCallback(async () => {
    const me = (await getJsonWithAuth("/users/me")) as { booking24hEnabled?: boolean | null };
    setBooking24hEnabled(!!me?.booking24hEnabled);
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
      await Promise.all([fetchBusinessHours(), fetchAppointments(weekStart, weekEnd), fetchMe()]);
    } catch (e) {
      const err = e as ApiError;
      setError(err?.message || "載入行程失敗");
    } finally {
      setLoading(false);
    }
  }, [ensureAuthorized, fetchAppointments, fetchBusinessHours, fetchMe, weekEnd, weekStart]);

  const calendarBusinessHours = useMemo(() => {
    if (!show24h) return branch?.businessHours ?? null;
    // Force 24h display; this is only for calendar viewport, not for booking rules.
    return {
      days: {
        "0": { open: "00:00", close: "24:00" },
        "1": { open: "00:00", close: "24:00" },
        "2": { open: "00:00", close: "24:00" },
        "3": { open: "00:00", close: "24:00" },
        "4": { open: "00:00", close: "24:00" },
        "5": { open: "00:00", close: "24:00" },
        "6": { open: "00:00", close: "24:00" },
      },
    };
  }, [branch?.businessHours, show24h]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">週行程日曆</CardTitle>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-md border px-2 py-1">
              <Switch checked={show24h} onCheckedChange={(v) => setShow24h(!!v)} />
              <span className="text-xs text-text-muted-light">顯示 24 小時</span>
              {booking24hEnabled ? (
                <span className="text-[11px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                  已啟用 24h 預約
                </span>
              ) : null}
            </div>
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
            businessHours={calendarBusinessHours}
            appointments={appointments}
            onRefresh={refresh}
            onWeekStartChange={(next) => setWeekStart(next)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

