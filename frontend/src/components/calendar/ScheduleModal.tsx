"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type ScheduleMode = "confirm" | "reschedule";

export type ScheduleModalInitial = {
  appointmentId: string;
  customerName?: string;
  serviceName?: string;
  status: string;
  startAt: Date;
  holdMin: number;
  mode: ScheduleMode;
};

function toLocalDateTimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalDateTimeInputValue(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default function ScheduleModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ScheduleModalInitial | null;
  submitting?: boolean;
  onSubmit: (input: { startAt: Date; holdMin: number; reason?: string }) => Promise<void>;
}) {
  const { open, onOpenChange, initial, submitting = false, onSubmit } = props;

  const title = useMemo(() => {
    if (!initial) return "";
    return initial.mode === "confirm" ? "排定正式時間" : "改期";
  }, [initial]);

  const [startAt, setStartAt] = useState<string>("");
  const [holdMin, setHoldMin] = useState<number>(150);
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) return;
    setStartAt(toLocalDateTimeInputValue(initial.startAt));
    setHoldMin(initial.holdMin ?? 150);
    setReason("");
    setError(null);
  }, [initial]);

  const safeSetHold = (next: number) => {
    const n = Number(next);
    if (!Number.isFinite(n)) return;
    setHoldMin(n);
  };

  const handleSubmit = async () => {
    if (!initial) return;
    setError(null);
    const parsed = fromLocalDateTimeInputValue(startAt);
    if (!parsed) {
      setError("請選擇開始時間");
      return;
    }
    if (!Number.isInteger(holdMin) || holdMin <= 0 || holdMin > 24 * 60) {
      setError("保留時間必須為 1 到 1440 分鐘之間");
      return;
    }
    await onSubmit({ startAt: parsed, holdMin, reason: reason.trim() ? reason.trim() : undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {initial ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              {initial.customerName ? `客戶：${initial.customerName}` : null}
              {initial.serviceName ? `　服務：${initial.serviceName}` : null}
            </div>

            <div className="space-y-1">
              <div className="text-sm text-gray-700">
                新開始時間 <span className="text-red-500">*</span>
              </div>
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>

            <div className="text-sm text-gray-600">保留時間（分鐘）：{holdMin}</div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => safeSetHold(Math.max(1, holdMin - 60))}>
                -60
              </Button>
              <Button type="button" variant="outline" onClick={() => safeSetHold(Math.max(1, holdMin - 30))}>
                -30
              </Button>
              <Button type="button" variant="outline" onClick={() => safeSetHold(Math.max(1, holdMin - 15))}>
                -15
              </Button>
              <Button type="button" variant="outline" onClick={() => safeSetHold(holdMin + 15)}>
                +15
              </Button>
              <Button type="button" variant="outline" onClick={() => safeSetHold(holdMin + 30)}>
                +30
              </Button>
              <Button type="button" variant="outline" onClick={() => safeSetHold(holdMin + 60)}>
                +60
              </Button>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-gray-700">自訂保留時間（分鐘）</div>
              <Input
                type="number"
                min={1}
                max={24 * 60}
                value={holdMin}
                onChange={(e) => safeSetHold(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm text-gray-700">原因（選填）</div>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={initial.mode === "confirm" ? "例如：客戶確認時間／刺青師排定" : "例如：客戶改期／調整排程"}
              />
            </div>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
                取消
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                確認
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}


