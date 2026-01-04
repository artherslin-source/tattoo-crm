import type { Prisma } from '@prisma/client';

export type TimeRange = { startMin: number; endMin: number }; // minutes from 00:00

export function parseHHmm(time: string): number {
  const [hh, mm] = time.split(':').map((x) => parseInt(x, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) throw new Error('Invalid time');
  return hh * 60 + mm;
}

export function formatHHmm(totalMin: number): string {
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function dayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const sorted = [...ranges].sort((a, b) => a.startMin - b.startMin);
  const out: TimeRange[] = [];
  for (const r of sorted) {
    if (!out.length) {
      out.push({ ...r });
      continue;
    }
    const last = out[out.length - 1];
    if (r.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, r.endMin);
    } else {
      out.push({ ...r });
    }
  }
  return out;
}

export function subtractRanges(base: TimeRange[], blocks: TimeRange[]): TimeRange[] {
  let result = mergeRanges(base);
  const mergedBlocks = mergeRanges(blocks);

  for (const b of mergedBlocks) {
    const next: TimeRange[] = [];
    for (const r of result) {
      // no overlap
      if (b.endMin <= r.startMin || b.startMin >= r.endMin) {
        next.push(r);
        continue;
      }
      // split
      if (b.startMin > r.startMin) next.push({ startMin: r.startMin, endMin: b.startMin });
      if (b.endMin < r.endMin) next.push({ startMin: b.endMin, endMin: r.endMin });
    }
    result = next;
  }
  return result;
}

export function buildSlotStarts(ranges: TimeRange[], durationMin: number, stepMin: number): string[] {
  const out: string[] = [];
  const merged = mergeRanges(ranges);
  for (const r of merged) {
    let t = r.startMin;
    while (t + durationMin <= r.endMin) {
      // Only return start times for the selected day (00:00-23:59),
      // but allow duration to spill into the next day when endMin > 24h.
      if (t >= 24 * 60) break;
      out.push(formatHHmm(t));
      t += stepMin;
    }
  }
  return out;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function appointmentBlocksToRanges(appointments: Array<{ startAt: Date; endAt: Date }>, date: Date): TimeRange[] {
  const { start } = dayBounds(date);
  return appointments.map((apt) => {
    const startMin = Math.max(0, Math.floor((apt.startAt.getTime() - start.getTime()) / 60000));
    const endMin = Math.min(24 * 60, Math.ceil((apt.endAt.getTime() - start.getTime()) / 60000));
    return { startMin, endMin };
  });
}

export function defaultBusinessHours(): TimeRange[] {
  // Default 10:00-22:00
  // Note: actual branch.businessHours (if configured) will override this default.
  return [{ startMin: 10 * 60, endMin: 22 * 60 }];
}

export function parseBranchBusinessHours(businessHours: unknown, weekday: number): TimeRange[] | null {
  // Try a few permissive formats:
  // 1) { [weekday]: [{ start: "10:00", end: "20:00" }] } where weekday is 0-6
  // 2) { days: { [weekday]: { open: "10:00", close: "20:00" } } }
  try {
    if (!businessHours || typeof businessHours !== 'object') return null;
    const anyBH = businessHours as any;
    const direct = anyBH?.[weekday];
    if (Array.isArray(direct)) {
      return direct
        .filter((x: any) => x?.start && x?.end)
        .map((x: any) => {
          const startMin = parseHHmm(x.start);
          let endMin = parseHHmm(x.end);
          if (endMin < startMin) endMin += 24 * 60;
          return { startMin, endMin };
        });
    }
    const days = anyBH?.days?.[weekday];
    if (days?.open && days?.close) {
      const startMin = parseHHmm(days.open);
      let endMin = parseHHmm(days.close);
      if (endMin < startMin) endMin += 24 * 60;
      return [{ startMin, endMin }];
    }
    return null;
  } catch {
    return null;
  }
}

export function availabilityToRanges(records: Array<{ startTime: string; endTime: string; isBlocked: boolean }>): {
  available: TimeRange[];
  blocked: TimeRange[];
} {
  const available: TimeRange[] = [];
  const blocked: TimeRange[] = [];
  for (const r of records) {
    const startMin = parseHHmm(r.startTime);
    let endMin = parseHHmm(r.endTime);
    // Cross-day support: 18:00-02:00 means end is on next day.
    if (endMin < startMin) endMin += 24 * 60;
    const range = { startMin, endMin };
    if (r.isBlocked) blocked.push(range);
    else available.push(range);
  }
  return { available: mergeRanges(available), blocked: mergeRanges(blocked) };
}

export type AvailabilityQuery = {
  branchBusinessHours: unknown;
  weekday: number;
  durationMin: number;
  stepMin: number;
  availabilityRecords: Array<{ startTime: string; endTime: string; isBlocked: boolean }>;
  appointmentBlocks: Array<{ startAt: Date; endAt: Date }>;
  date: Date;
};

export function computeAvailableSlots(input: AvailabilityQuery): { slots: string[] } {
  const branchRanges = parseBranchBusinessHours(input.branchBusinessHours, input.weekday) ?? defaultBusinessHours();
  const { available, blocked } = availabilityToRanges(input.availabilityRecords);
  const base = available.length ? available : branchRanges;

  const appointmentRanges = appointmentBlocksToRanges(input.appointmentBlocks, input.date);
  const afterBlocked = subtractRanges(base, blocked);
  const afterAppointments = subtractRanges(afterBlocked, appointmentRanges);
  const slots = buildSlotStarts(afterAppointments, input.durationMin, input.stepMin);
  return { slots };
}


