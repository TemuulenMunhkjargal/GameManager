import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

type RouteContext = {
  params: Promise<{
    eventId: string;
    registrationId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { eventId, registrationId } = await context.params;

  const result = await container.useCases.recordManualPayment.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    eventId,
    registrationId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    registration: { id: result.value.registration.id, status: result.value.registration.status },
    payment: { id: result.value.payment.id, status: result.value.payment.status },
  });
}
