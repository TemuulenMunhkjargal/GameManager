import { DashboardSidebar } from "./sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-shell">
      <DashboardSidebar />
      <main className="main">{children}</main>
    </div>
  );
}
