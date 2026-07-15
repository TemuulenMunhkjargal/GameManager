import { describe, expect, it } from "vitest";
import { parseDiscordWebhookUrl } from "../../src/lib/discord-webhook";

describe("parseDiscordWebhookUrl", () => {
  it("accepts Discord incoming webhook URLs", () => expect(parseDiscordWebhookUrl("https://discord.com/api/webhooks/123456/token_value")).not.toBeNull());
  it.each(["http://discord.com/api/webhooks/1/token", "https://example.com/api/webhooks/1/token", "https://discord.com/channels/1/2"])("rejects unsafe URL %s", (value) => expect(parseDiscordWebhookUrl(value)).toBeNull());
});
