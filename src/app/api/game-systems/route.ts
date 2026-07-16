import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const createGameSystemSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["tcg", "ttrpg", "miniatures", "board_game", "other"]),
  defaultCapacity: z.coerce.number().int().min(1).max(999),
  notes: z.string().default(""),
});

export async function GET(request: Request) {
  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  const gameSystems = await container.gameSystems.listForOrganization(DEFAULT_ORGANIZATION_ID, { includeArchived });
  return NextResponse.json({ gameSystems });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createGameSystemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid game system details.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await container.useCases.createGameSystem.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    name: parsed.data.name,
    type: parsed.data.type,
    defaultCapacity: parsed.data.defaultCapacity,
    notes: parsed.data.notes,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ gameSystem: { id: result.value.id, name: result.value.name } }, { status: 201 });
}
