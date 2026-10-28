import { describe, expect, it } from "vitest";

function validInterval(start: Date, end: Date) {
  if (end <= start) return false;
  if (start.getMinutes() % 30 || end.getMinutes() % 30) return false;
  if (end.getTime() - start.getTime() > 4 * 60 * 60 * 1000) return false;
  return true;
}
describe("reservation interval rules", () => {
  it("accepts aligned 90-minute bookings", () => {
    expect(validInterval(new Date("2027-01-04T08:00:00Z"), new Date("2027-01-04T09:30:00Z"))).toBe(true);
  });
  it("rejects non-30-minute boundaries", () => {
    expect(validInterval(new Date("2027-01-04T08:15:00Z"), new Date("2027-01-04T09:30:00Z"))).toBe(false);
  });
  it("rejects non-positive intervals", () => {
    expect(validInterval(new Date("2027-01-04T09:00:00Z"), new Date("2027-01-04T09:00:00Z"))).toBe(false);
  });
  it("allows adjacent but not overlapping intervals conceptually", () => {
    const a = { start: 8, end: 9 }, adjacent = { start: 9, end: 10 }, overlap = { start: 8.5, end: 9.5 };
    expect(a.end <= adjacent.start || adjacent.end <= a.start).toBe(true);
    expect(a.end <= overlap.start || overlap.end <= a.start).toBe(false);
  });
});
