import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  capacity: z.number().int().min(1).max(20),
  quantity: z.number().int().min(1).max(20).default(1),
});

export async function GET() {
  return NextResponse.json({ tables: await container.tables.listForOrganization(DEFAULT_ORGANIZATION_ID) });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter 1–20 tables with 1–20 seats each." }, { status: 400 });
  const existing = (await container.tables.listForOrganization(DEFAULT_ORGANIZATION_ID)).filter((table) => table.status === "active").length;
  if (existing + parsed.data.quantity > 20) return NextResponse.json({ error: `GameHall supports up to 20 active tables. You can add ${Math.max(0, 20 - existing)} more.` }, { status: 400 });
  for (let index = 1; index <= parsed.data.quantity; index += 1) {
    const name = parsed.data.quantity === 1 ? parsed.data.name : `${parsed.data.name} ${index}`;
    await container.tables.create(DEFAULT_ORGANIZATION_ID, name, parsed.data.capacity);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
