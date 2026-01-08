"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizePhoneDigits } from "@/lib/phone";

export type PhoneConflictsResult = {
  normalizedPhone: string | null;
  userExists: boolean;
  contactExists: boolean;
  messageCode: string;
  message: string;
};

export function usePhoneConflicts(phoneInput: string) {
  const normalizedDigits = useMemo(() => normalizePhoneDigits(phoneInput), [phoneInput]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PhoneConflictsResult | null>(null);

  useEffect(() => {
    const digits = normalizedDigits;
    if (!digits || digits.length < 10) {
      setResult(null);
      setLoading(false);
      return;
    }

    let alive = true;
    const t = window.setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/phone-conflicts?phone=${encodeURIComponent(digits)}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as PhoneConflictsResult | null;
        if (!alive) return;
        if (data) setResult(data);
        else setResult(null);
      } catch {
        if (!alive) return;
        setResult(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }, 400);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [normalizedDigits]);

  return { loading, result, normalizedDigits };
}


