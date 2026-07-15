"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

export type CalendarItem = { id: string; title: string; start: string; end?: string | null; href?: string; label?: string };
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayStart(value: Date): Date { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function key(value: Date): string { return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`; }

export function ScheduleCalendar({ items, emptyCopy }: { items: CalendarItem[]; emptyCopy: string }) {
  const initial = useMemo(() => {
    const upcoming = items.map((item) => new Date(item.start)).filter((date) => !Number.isNaN(date.getTime()) && date >= dayStart(new Date())).sort((a, b) => a.getTime() - b.getTime())[0];
    return upcoming ?? new Date();
  }, [items]);
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const cursor = new Date(first); cursor.setDate(cursor.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(cursor); date.setDate(cursor.getDate() + index); return date; });
  }, [month]);
  function itemsFor(date: Date) {
    const target = dayStart(date).getTime();
    return items.filter((item) => {
      const start = dayStart(new Date(item.start)).getTime();
      const end = dayStart(new Date(item.end ?? item.start)).getTime();
      return target >= start && target <= end;
    });
  }
  return <section className="panel calendar-panel">
    <div className="calendar-header"><button className="icon-button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></button><h2>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><button className="icon-button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight /></button></div>
    {items.length === 0 ? <p className="empty-calendar">{emptyCopy}</p> : null}
    <div className="calendar-grid">{weekdays.map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}{cells.map((date) => { const dayItems = itemsFor(date); const outside = date.getMonth() !== month.getMonth(); const today = key(date) === key(new Date()); return <div className={`calendar-day${outside ? " outside" : ""}${today ? " today" : ""}`} key={key(date)}><span className="day-number">{date.getDate()}</span><div className="calendar-items">{dayItems.slice(0, 3).map((item) => item.href ? <Link className="calendar-item" href={item.href} key={item.id} title={item.title}><strong>{item.title}</strong>{item.label ? <span>{item.label}</span> : null}</Link> : <div className="calendar-item" key={item.id}><strong>{item.title}</strong>{item.label ? <span>{item.label}</span> : null}</div>)}{dayItems.length > 3 ? <span className="more-items">+{dayItems.length - 3} more</span> : null}</div></div>; })}</div>
  </section>;
}
