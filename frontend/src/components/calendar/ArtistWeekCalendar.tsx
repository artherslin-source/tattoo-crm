"use client";

import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { Calendar as RBCalendar, momentLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { patchJsonWithAuth, postJsonWithAuth, ApiError } from "@/lib/api";
import ScheduleModal, { type ScheduleModalInitial } from "./ScheduleModal";

export type CalendarAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  holdMin?: number;
  notes?: string;
  user?: { id: string; name: string; phone?: string; email?: string };
  service?: { id: string; name: string };
  branch?: { id: string; name: string };
};

type TimeRange = { startMin: number; endMin: number };

type BusinessHoursDirectRange = { start: string; end: string };
type BusinessHoursDaysRange = { open: string; close: string };

type DragResource = {
  appointmentId: string;
  status: string;
  holdMin: number;
  customerName?: string;
  serviceName?: string;
};
type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: DragResource;
};

function parseHHmm(time: string): number {
  const [hh, mm] = time.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) throw new Error("Invalid time");
  return hh * 60 + mm;
}

function defaultBusinessHours(): TimeRange[] {
  return [{ startMin: 10 * 60, endMin: 22 * 60 }];
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

function isBusinessHoursDirectRange(val: unknown): val is BusinessHoursDirectRange {
  if (!isRecord(val)) return false;
  return typeof val.start === "string" && typeof val.end === "string";
}

function isBusinessHoursDaysRange(val: unknown): val is BusinessHoursDaysRange {
  if (!isRecord(val)) return false;
  return typeof val.open === "string" && typeof val.close === "string";
}

function toMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function formatYYYYMMDD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseBranchBusinessHours(businessHours: unknown, weekday: number): TimeRange[] | null {
  try {
    if (!isRecord(businessHours)) return null;
    const direct = businessHours[String(weekday)];
    if (Array.isArray(direct)) {
      const ranges = direct.filter(isBusinessHoursDirectRange).map((x) => ({ startMin: parseHHmm(x.start), endMin: parseHHmm(x.end) }));
      return ranges.length ? ranges : null;
    }
    const daysObj = businessHours.days;
    if (isRecord(daysObj)) {
      const dayRange = daysObj[String(weekday)];
      if (isBusinessHoursDaysRange(dayRange)) {
        return [{ startMin: parseHHmm(dayRange.open), endMin: parseHHmm(dayRange.close) }];
      }
    }
    return null;
  } catch {
    return null;
  }
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function badgeForStatus(status: string): string {
  switch (status) {
    case "INTENT":
      return "#6b7280";
    case "PENDING":
      return "#f59e0b";
    case "CONFIRMED":
      return "#3b82f6";
    case "IN_PROGRESS":
      return "#8b5cf6";
    case "COMPLETED":
      return "#10b981";
    case "CANCELED":
      return "#ef4444";
    case "NO_SHOW":
      return "#f97316";
    default:
      return "#6b7280";
  }
}

export default function ArtistWeekCalendar(props: {
  loading: boolean;
  weekStart: Date;
  businessHours: unknown | null;
  appointments: CalendarAppointment[];
  onRefresh: () => Promise<void>;
  onWeekStartChange?: (next: Date) => void;
}) {
  const { weekStart, businessHours, appointments, onRefresh, onWeekStartChange } = props;
  const [view, setView] = useState<"month" | "week" | "day" | "agenda">("week");
  const [currentDate, setCurrentDate] = useState<Date>(() => weekStart);
  const [toast, setToast] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleInitial, setScheduleInitial] = useState<ScheduleModalInitial | null>(null);

  // ensure week starts on Monday in moment localizer
  useMemo(() => {
    try {
      moment.updateLocale(moment.locale(), { week: { dow: 1 } });
    } catch {}
    return null;
  }, []);
  const localizer = useMemo(() => momentLocalizer(moment), []);

  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

  const weekHours = useMemo(() => {
    let minStart = Number.POSITIVE_INFINITY;
    let maxEnd = 0;
    for (const day of days) {
      const weekday = day.getDay();
      const ranges = parseBranchBusinessHours(businessHours, weekday) ?? defaultBusinessHours();
      for (const r of ranges) {
        minStart = Math.min(minStart, r.startMin);
        maxEnd = Math.max(maxEnd, r.endMin);
      }
    }
    if (!Number.isFinite(minStart) || maxEnd <= 0 || minStart >= maxEnd) {
      const d = defaultBusinessHours()[0];
      return { startMin: d.startMin, endMin: d.endMin };
    }
    return { startMin: minStart, endMin: maxEnd };
  }, [businessHours, days]);

  const openSchedule = (input: ScheduleModalInitial) => {
    setScheduleInitial(input);
    setScheduleOpen(true);
  };

  const submitSchedule = async (input: { startAt: Date; holdMin: number; reason?: string }) => {
    if (!scheduleInitial) return;
    setScheduleSubmitting(true);
    try {
      if (scheduleInitial.mode === "confirm") {
        await postJsonWithAuth(`/artist/appointments/${scheduleInitial.appointmentId}/confirm-schedule`, {
          startAt: input.startAt.toISOString(),
          holdMin: input.holdMin,
          reason: input.reason,
        });
      } else {
        await postJsonWithAuth(`/artist/appointments/${scheduleInitial.appointmentId}/reschedule`, {
          startAt: input.startAt.toISOString(),
          holdMin: input.holdMin,
          reason: input.reason,
        });
      }
      setScheduleOpen(false);
      setScheduleInitial(null);
      await onRefresh();
      setToast(scheduleInitial.mode === "confirm" ? "已排定正式時間" : "已改期");
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      const err = e as ApiError;
      setToast(err?.message || "操作失敗");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const events = useMemo<CalendarEvent[]>(() => {
    return appointments.map((a) => {
      const customerName = a.user?.name ?? "未命名客戶";
      const serviceName = a.service?.name ?? "—";
      const title = `${customerName}｜${serviceName}`;
      const holdMin = a.holdMin ?? 150;
      const status = a.status;
      const start = new Date(a.startAt);
      const end = new Date(a.endAt);
      // For all-day INTENT, render as all-day block (end=start+1day)
      const allDay = status === "INTENT";
      const renderEnd = allDay ? addDays(startOfDay(start), 1) : end;
      return {
        title,
        start,
        end: renderEnd,
        allDay,
        resource: {
          appointmentId: a.id,
          status,
          holdMin,
          customerName,
          serviceName,
        },
      };
    });
  }, [appointments]);

  const minTime = useMemo(() => {
    const d = new Date(1970, 0, 1, 0, 0, 0, 0);
    d.setMinutes(weekHours.startMin);
    return d;
  }, [weekHours.startMin]);

  const maxTime = useMemo(() => {
    const d = new Date(1970, 0, 1, 0, 0, 0, 0);
    d.setMinutes(weekHours.endMin);
    return d;
  }, [weekHours.endMin]);

  const draggableAccessor = (event: CalendarEvent): boolean => {
    const s = event.resource.status;
    return s === "INTENT" || s === "CONFIRMED" || s === "IN_PROGRESS" || s === "PENDING";
  };

  const handleEventDrop = async (args: unknown) => {
    // args shape: { event, start, end, isAllDay } from RBC DnD addon
    if (!isRecord(args)) return;
    const event = args.event as unknown;
    const start = args.start as unknown;
    const isAllDay = args.isAllDay as unknown;

    if (!event || !(event as CalendarEvent).resource) return;
    const calEvent = event as CalendarEvent;
    const nextStart = start instanceof Date ? start : new Date(String(start));
    if (Number.isNaN(nextStart.getTime())) return;

    const nextIsAllDay = typeof isAllDay === "boolean" ? isAllDay : false;
    const status = calEvent.resource.status;
    const holdMin = calEvent.resource.holdMin ?? 150;

    // INTENT dropped within all-day: move preferred date (still INTENT)
    if (status === "INTENT" && nextIsAllDay) {
      try {
        await patchJsonWithAuth(`/artist/appointments/${calEvent.resource.appointmentId}/intent-date`, {
          preferredDate: formatYYYYMMDD(nextStart),
          holdMin,
        });
        await onRefresh();
        setToast("已更新意向日期");
        setTimeout(() => setToast(null), 2500);
      } catch (e) {
        const err = e as ApiError;
        setToast(err?.message || "更新意向日期失敗");
        setTimeout(() => setToast(null), 3000);
        await onRefresh();
      }
      return;
    }

    // For timed drops, validate within business hours
    const nextMin = toMinutes(nextStart);
    if (nextMin < weekHours.startMin || nextMin >= weekHours.endMin) {
      setToast("不可拖到營業時間外");
      setTimeout(() => setToast(null), 2500);
      await onRefresh();
      return;
    }

    if (status === "INTENT" && !nextIsAllDay) {
      openSchedule({
        mode: "confirm",
        appointmentId: calEvent.resource.appointmentId,
        status,
        startAt: nextStart,
        holdMin,
        customerName: calEvent.resource.customerName,
        serviceName: calEvent.resource.serviceName,
      });
      return;
    }

    if (status === "CONFIRMED" || status === "IN_PROGRESS" || status === "PENDING") {
      openSchedule({
        mode: "reschedule",
        appointmentId: calEvent.resource.appointmentId,
        status,
        startAt: nextStart,
        holdMin,
        customerName: calEvent.resource.customerName,
        serviceName: calEvent.resource.serviceName,
      });
      return;
    }

    setToast("此狀態不可拖拉");
    setTimeout(() => setToast(null), 2500);
    await onRefresh();
  };

  const eventPropGetter = (event: CalendarEvent): { style: React.CSSProperties } => {
    const color = badgeForStatus(event.resource.status);
    const isIntent = event.resource.status === "INTENT";
    return {
      style: {
        backgroundColor: isIntent ? "rgba(107,114,128,0.12)" : "rgba(255,255,255,0.92)",
        border: `1px solid ${color}`,
        color: "#111827",
        borderRadius: 8,
        fontSize: 12,
        padding: "2px 6px",
      },
    };
  };

  const DragAndDropCalendar = useMemo(() => {
    return withDragAndDrop(RBCalendar as unknown as React.ComponentType<Record<string, unknown>>) as unknown as React.ComponentType<
      Record<string, unknown>
    >;
  }, []);

  useEffect(() => {
    setCurrentDate(weekStart);
  }, [weekStart]);

  const alignToMonday = (d: Date) => {
    const day = d.getDay(); // 0=Sun
    const diff = (day + 6) % 7;
    const monday = new Date(d);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - diff);
    return monday;
  };

  const handleNavigate = (nextDate: unknown) => {
    const d = nextDate instanceof Date ? nextDate : new Date(String(nextDate));
    if (Number.isNaN(d.getTime())) return;
    if (view === "week") {
      const monday = alignToMonday(d);
      setCurrentDate(monday);
      onWeekStartChange?.(monday);
      return;
    }
    setCurrentDate(d);
  };

  return (
    <div className="space-y-3">
      {toast ? <div className="text-sm text-gray-700">{toast}</div> : null}

      <div
        className="rounded-lg border border-gray-200 bg-white p-2"
        // react-big-calendar 需要固定高度，否則 Month/Agenda 會被壓扁只剩標題列
        style={{ height: "min(720px, calc(100vh - 260px))", minHeight: 520 }}
      >
        <DragAndDropCalendar
          localizer={localizer}
          date={view === "week" ? weekStart : currentDate}
          view={view}
          onView={(v) => {
            const next = String(v) as "month" | "week" | "day" | "agenda";
            setView(next);
            if (next === "week") {
              const monday = alignToMonday(currentDate);
              setCurrentDate(monday);
              onWeekStartChange?.(monday);
            }
          }}
          views={["month", "week", "day", "agenda"]}
          events={events}
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          draggableAccessor={draggableAccessor}
          onEventDrop={handleEventDrop}
          onNavigate={handleNavigate}
          step={30}
          timeslots={1}
          min={minTime}
          max={maxTime}
          toolbar
          popup
          selectable={false}
          eventPropGetter={eventPropGetter}
        />
      </div>

      <ScheduleModal
        open={scheduleOpen}
        onOpenChange={(o) => {
          setScheduleOpen(o);
          if (!o) {
            setScheduleInitial(null);
            // If user cancels after a drop, refresh to restore UI position.
            void onRefresh();
          }
        }}
        initial={scheduleInitial}
        submitting={scheduleSubmitting}
        onSubmit={submitSchedule}
      />
    </div>
  );
}


