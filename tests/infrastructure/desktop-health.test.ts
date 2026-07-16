import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ db: database }));

import { GET } from "@/app/api/health/route";

describe("desktop health endpoint", () => {
  beforeEach(() => {
    database.run.mockReset();
  });

  it("reports ready only after SQLite accepts a query", async () => {
    const response = await GET();

    expect(database.run).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("returns 503 when SQLite or migration initialization is unavailable", async () => {
    database.run.mockImplementationOnce(() => { throw new Error("database unavailable"); });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  });
});
