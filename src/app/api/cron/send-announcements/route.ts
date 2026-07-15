import { NextResponse } from "next/server";
import { container } from "@/infrastructure/container";

/** Invoked once per minute by Electron using a private token generated at launch. */
export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");
  if (expectedSecret && provided !== expectedSecret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json(await container.useCases.sendDueAnnouncements.execute());
}
