import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [{ sql }, { db }] = await Promise.all([
      import("drizzle-orm"),
      import("@/infrastructure/db/client"),
    ]);
    db.run(sql`SELECT 1`);
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[health] database check failed", error);
    return NextResponse.json(
      { ok: false, error: "The local database is not ready." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
