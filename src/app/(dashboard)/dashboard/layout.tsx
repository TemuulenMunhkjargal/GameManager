import { redirect } from "next/navigation";
import { DashboardSidebar } from "./sidebar";
import { SignOutButton } from "./sign-out-button";
import { resolveActor, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);

  if (!actor) {
    redirect("/sign-in");
  }

  return (
    <div className="app-shell">
      <DashboardSidebar />
      <div className="main-column">
        <header className="dashboard-header">
          <div>
            <strong>{actor.user.displayName}</strong>
            <div className="muted">{actor.membership?.role ?? "no role assigned"}</div>
          </div>
          <SignOutButton />
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}


