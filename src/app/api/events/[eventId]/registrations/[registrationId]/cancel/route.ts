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

  const cancelResult = await container.useCases.cancelRegistration.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    eventId,
    registrationId,
  });

  if (cancelResult.ok) {
    return NextResponse.json({
      outcome: "cancelled",
      cancelled: { id: cancelResult.value.cancelled.id, status: cancelResult.value.cancelled.status },
      promoted: cancelResult.value.promoted
        ? { id: cancelResult.value.promoted.id, status: cancelResult.value.promoted.status }
        : null,
    });
  }

  // Not every "Cancel" click is a confirmed registration — it might be a
  // waitlist entry, which lives in a separate table/use case.
  const withdrawResult = await container.useCases.withdrawFromWaitlist.execute({
    eventId,
    waitlistEntryId: registrationId,
  });

  if (!withdrawResult.ok) {
    return NextResponse.json({ error: withdrawResult.error }, { status: 400 });
  }

  return NextResponse.json({
    outcome: "withdrawn",
    withdrawn: { id: withdrawResult.value.id, status: withdrawResult.value.status },
  });
}
