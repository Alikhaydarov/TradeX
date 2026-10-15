"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export function CalendarMonthSwitcher({ month }: { month: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const year = Number(month.slice(0, 4));
  const activeMonth = Number(month.slice(5, 7)) - 1;
  useEffect(() => {
    const strip = ref.current;
    const active = strip?.querySelector<HTMLElement>("[aria-current]");
    if (strip && active)
      strip.scrollLeft =
        active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2;
  }, [month]);
  return (
    <div ref={ref} className="calendar-month-strip" aria-label="Select month">
      <span>{year}</span>
      {Array.from({ length: 12 }, (_, index) => (
        <Link
          key={index}
          href={
            "/calendar?month=" + year + "-" + String(index + 1).padStart(2, "0")
          }
          aria-current={index === activeMonth ? "date" : undefined}
        >
          {new Intl.DateTimeFormat("en-US", {
            month: "short",
            timeZone: "UTC",
          }).format(new Date(Date.UTC(year, index, 1)))}
        </Link>
      ))}
    </div>
  );
}
