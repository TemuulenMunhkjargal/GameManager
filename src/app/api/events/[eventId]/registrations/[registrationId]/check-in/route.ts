import { NextResponse } from "next/server";
import { container } from "@/infrastructure/container";

type RouteContext = {
  params: Promise<{
    eventId: string;
    registrationId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { eventId, registrationId } = await context.params;

  const result = await container.useCases.checkInRegistration.execute({
    eventId,
    registrationId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    registration: { id: result.value.id, status: result.value.status },
  });
}
