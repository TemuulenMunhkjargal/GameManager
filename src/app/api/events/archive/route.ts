import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { splitArchivedEvents } from "@/lib/event-archive";

const schema = z.union([z.object({ all: z.literal(true) }), z.object({ eventIds: z.array(z.string()).min(1).max(100) })]);

export async function DELETE(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose at least one archived event." }, { status: 400 });
  const events = await container.events.listForOrganization(DEFAULT_ORGANIZATION_ID);
  const archived = splitArchivedEvents(events);
  const pastIds = new Set([...archived.retained, ...archived.expired].map((event) => event.id));
  const requested = "all" in parsed.data ? [...pastIds] : parsed.data.eventIds.filter((id) => pastIds.has(id));
  await Promise.all(requested.map((id) => container.events.delete(id, DEFAULT_ORGANIZATION_ID)));
  return NextResponse.json({ deleted: requested.length });
}
