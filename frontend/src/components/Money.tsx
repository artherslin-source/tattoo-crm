"use client";

import { formatMoney } from "@/lib/money";

export function Money(props: { amount: number | null | undefined; className?: string; amountClassName?: string; symbolClassName?: string }) {
  const { amount, className, amountClassName, symbolClassName } = props;
  return (
    <span className={className ? `inline-flex items-baseline justify-end gap-1 ${className}` : "inline-flex items-baseline justify-end gap-1"}>
      <span className={symbolClassName ?? "text-inherit"}>$</span>
      <span className={amountClassName ?? "tabular-nums text-right"}>{formatMoney(amount)}</span>
    </span>
  );
}


