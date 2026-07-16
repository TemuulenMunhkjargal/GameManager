import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/organization/discord/test/route";

afterEach(() => vi.restoreAllMocks());

describe("Discord connection test route", () => {
  it("sends a mention-safe request with a deadline", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const response = await POST(new Request("http://localhost/api/organization/discord/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl: "https://discord.com/api/webhooks/123/token_value" }),
    }));

    expect(response.status).toBe(200);
    const [, options] = fetchMock.mock.calls[0];
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(options?.body))).toMatchObject({ allowed_mentions: { parse: [] } });
  });
});
