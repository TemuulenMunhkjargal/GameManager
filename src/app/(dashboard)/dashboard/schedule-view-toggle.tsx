"use client";

import { CalendarDays, List } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ScheduleViewToggle({ view }: { view: "list" | "calendar" }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  function setView(next: "list" | "calendar") {
    const params = new URLSearchParams(search.toString());
    if (next === "list") params.delete("view"); else params.set("view", next);
    router.push(`${pathname}${params.size ? `?${params}` : ""}`);
  }
  return <div className="view-toggle" aria-label="Schedule view">
    <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} type="button"><List size={16} /> List</button>
    <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")} type="button"><CalendarDays size={16} /> Calendar</button>
  </div>;
}
