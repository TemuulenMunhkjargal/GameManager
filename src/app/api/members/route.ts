import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const schema = z.object({
  displayName: z.string().min(1, "Name is required."),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  favoriteGameSystem: z.string().default("Unspecified"),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid member details.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await container.useCases.createMemberProfile.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    displayName: parsed.data.displayName,
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null,
    favoriteGameSystem: parsed.data.favoriteGameSystem,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(
    { member: { id: result.value.id, displayName: result.value.displayName } },
    { status: 201 },
  );
}
