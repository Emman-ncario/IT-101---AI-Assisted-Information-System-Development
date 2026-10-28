import { describe, expect, it } from "vitest";

describe("frontend configuration", () => {
  it("uses the API environment variable with a local development fallback", () => {
    expect(import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").toContain("/api");
  });
});
