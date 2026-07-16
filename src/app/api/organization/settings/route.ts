import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { parseDiscordWebhookUrl } from "@/lib/discord-webhook";

const updateSettingsSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.union([z.literal(""), z.string().email()]),
  timezone: z.string().min(1),
  waitlistsEnabledByDefault: z.boolean(),
  discordWebhookUrl: z.string().url().nullable().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settings.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (parsed.data.discordWebhookUrl && !parseDiscordWebhookUrl(parsed.data.discordWebhookUrl)) {
    return NextResponse.json({ error: "The Discord webhook URL is not valid." }, { status: 400 });
  }

  const result = await container.useCases.updateOrganizationProfile.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    ...parsed.data,
    discordWebhookUrl: parsed.data.discordWebhookUrl ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ organization: { id: result.value.id, name: result.value.name } });
}
