import { describe, expect, it } from "vitest";
import { createId } from "../../src/lib/id";

describe("createId", () => {
  it("keeps the full UUID instead of a collision-prone fragment", () => {
    const id = createId("event");
    expect(id).toMatch(/^event_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("rejects prefixes that could produce ambiguous identifiers", () => {
    expect(() => createId("Event")).toThrow("prefixes");
    expect(() => createId("event-id")).toThrow("prefixes");
  });
});
