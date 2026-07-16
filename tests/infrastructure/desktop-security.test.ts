import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const allowedHost = "127.0.0.1:43123";
const sessionToken = "desktop-session-secret";
const schedulerToken = "scheduler-secret";

function request(pathname: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(`http://${allowedHost}${pathname}`, {
    method: init.method,
    headers: init.headers,
  });
}

describe("packaged desktop request boundary", () => {
  afterEach(() => vi.unstubAllEnvs());

  function enableDesktopSecurity() {
    vi.stubEnv("GAMEHALL_DESKTOP_MODE", "1");
    vi.stubEnv("GAMEHALL_ALLOWED_HOST", allowedHost);
    vi.stubEnv("GAMEHALL_SESSION_TOKEN", sessionToken);
    vi.stubEnv("CRON_SECRET", schedulerToken);
  }

  it("rejects a hostile Host before any application route runs", async () => {
    enableDesktopSecurity();
    const response = proxy(request("/api/backups/download", {
      headers: {
        host: "attacker.example",
        cookie: `gamehall_session=${sessionToken}`,
      },
    }));

    expect(response.status).toBe(421);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("host") });
  });

  it("rejects hostile mutation origins even when a valid session cookie is present", () => {
    enableDesktopSecurity();
    const response = proxy(request("/api/events", {
      method: "POST",
      headers: {
        host: allowedHost,
        cookie: `gamehall_session=${sessionToken}`,
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
    }));

    expect(response.status).toBe(403);
  });

  it("allows same-origin browser mutations with the HttpOnly launch session", () => {
    enableDesktopSecurity();
    const response = proxy(request("/api/events", {
      method: "POST",
      headers: {
        host: allowedHost,
        cookie: `gamehall_session=${sessionToken}`,
        origin: `http://${allowedHost}`,
        "sec-fetch-site": "same-origin",
      },
    }));

    expect(response.status).toBe(200);
  });

  it("allows authenticated scheduler calls without a browser Origin", () => {
    enableDesktopSecurity();
    const response = proxy(request("/api/cron/maintenance", {
      method: "POST",
      headers: {
        host: allowedHost,
        authorization: `Bearer ${schedulerToken}`,
      },
    }));

    expect(response.status).toBe(200);
  });

  it("fails closed when packaged security configuration is incomplete", () => {
    vi.stubEnv("GAMEHALL_DESKTOP_MODE", "1");
    const response = proxy(request("/dashboard", { headers: { host: allowedHost } }));
    expect(response.status).toBe(503);
  });

  it("does not require the desktop session during ordinary web development", () => {
    vi.stubEnv("GAMEHALL_DESKTOP_MODE", "0");
    const response = proxy(request("/dashboard", { headers: { host: "localhost:3000" } }));
    expect(response.status).toBe(200);
  });
});
