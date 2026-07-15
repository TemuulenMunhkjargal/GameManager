export function parseDiscordWebhookUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const allowedHost = url.hostname === "discord.com" || url.hostname === "discordapp.com";
    const validPath = /^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(url.pathname);
    return url.protocol === "https:" && allowedHost && validPath ? url : null;
  } catch {
    return null;
  }
}
