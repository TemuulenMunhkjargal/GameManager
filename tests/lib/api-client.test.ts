import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, messageFromRequestError, requestJson } from "../../src/lib/api-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("requestJson", () => {
  it("returns a successful JSON payload", async () => {
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(requestJson<{ ok: boolean }>("/api/health")).resolves.toEqual({ ok: true });
  });

  it("uses the API error instead of leaving callers with an opaque status", async () => {
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "League is already complete." }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(requestJson("/api/leagues/league_1", { method: "POST" })).rejects.toMatchObject({
      name: "ApiRequestError",
      message: "League is already complete.",
      status: 409,
    });
  });

  it("aborts a hung request at the deadline", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })));

    const request = requestJson("/api/events", { method: "POST" }, 100);
    const rejection = expect(request).rejects.toMatchObject({
      name: "ApiRequestError",
      message: expect.stringContaining("too long"),
      status: null,
    });
    await vi.advanceTimersByTimeAsync(100);
    await rejection;
  });

  it("normalizes unknown failures for client error messages", () => {
    expect(messageFromRequestError(new ApiRequestError("Offline", null), "Fallback")).toBe("Offline");
    expect(messageFromRequestError({}, "Fallback")).toBe("Fallback");
  });
});
