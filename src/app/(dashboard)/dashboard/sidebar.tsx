"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Gamepad2, LayoutDashboard, LayoutGrid, Settings, Trophy, Users } from "lucide-react";
import Image from "next/image";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/members", label: "Players", icon: Users },
  { href: "/dashboard/games", label: "Games", icon: Gamepad2 },
  { href: "/dashboard/venues", label: "Tables", icon: LayoutGrid },
  { href: "/dashboard/leagues", label: "Leagues", icon: Trophy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Image alt="GameHall" height={52} priority src="/gamehall-logo-192.png" width={52} /></div>
        <div className="brand-title">GameHall</div>
        <div className="brand-subtitle">Your game nights, organized</div>
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
