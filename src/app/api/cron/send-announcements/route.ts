import { NextResponse } from "next/server";
import { container } from "@/infrastructure/container";

/**
 * Intended to be invoked by an external scheduler (Vercel Cron, a
 * self-hosted cron job hitting this URL, etc.) roughly every few minutes.
 * Not tied to any single staff session — protected by a shared secret
 * instead of resolveActor().
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret) {
    const provided = request.headers.get("authorization")?.replace("Bearer ", "");

    if (provided !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const result = await container.useCases.sendDueAnnouncements.execute();

  return NextResponse.json(result);
}

// Some cron providers (including Vercel Cron) call via GET.
export const GET = POST;
