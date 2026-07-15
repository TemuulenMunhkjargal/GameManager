import { DashboardSidebar } from "./sidebar";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-shell">
      <DashboardSidebar />
      <div className="main-column">
        <header className="dashboard-header">
          <div>
            <strong>Your game-night workspace</strong>
            <div className="muted">Saved on this installation</div>
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}


