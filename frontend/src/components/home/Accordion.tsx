"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface AccordionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Accordion({ id, title, children, defaultOpen = false, className }: AccordionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  React.useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <section className={cn("border-b border-white/10", className)}>
      <button
        id={triggerId}
        type="button"
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/80"
      >
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className={cn("text-2xl transition-transform duration-300", open ? "rotate-90" : "")} aria-hidden>
          ›
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden pb-4">{children}</div>
      </div>
    </section>
  );
}
