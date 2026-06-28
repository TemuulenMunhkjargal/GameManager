"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Gamepad2, LayoutDashboard, Settings, Users } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/games", label: "Game Systems", icon: Gamepad2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">CT</div>
        <div className="brand-title">CritTable</div>
        <div className="brand-subtitle">Store event operations</div>
      </div>
      <nav aria-label="Dashboard">
        <ul className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <Link className={`nav-item${isActive ? " active" : ""}`} href={item.href}>
                  <Icon aria-hidden="true" size={18} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
