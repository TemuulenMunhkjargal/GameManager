import { NextResponse } from "next/server";
import { z } from "zod";
import { parseDiscordWebhookUrl } from "@/lib/discord-webhook";

const schema = z.object({ webhookUrl: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const url = parsed.success ? parseDiscordWebhookUrl(parsed.data.webhookUrl) : null;
  if (!url) return NextResponse.json({ error: "Paste a valid Discord channel webhook URL." }, { status: 400 });
  url.searchParams.set("wait", "true");
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "GameHall", content: "GameHall is connected. New published events can now be announced in this channel.", allowed_mentions: { parse: [] } }) });
    if (!response.ok) return NextResponse.json({ error: `Discord rejected the webhook (${response.status}). Check that it still exists.` }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not reach Discord. Check your internet connection and try again." }, { status: 502 });
  }
}
