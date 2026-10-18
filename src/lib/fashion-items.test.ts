import { describe, expect, it } from "vitest";
import { hasCaption, normalizeCaption } from "./fashion-items";

describe("lookbook captions", () => {
  it("stores a typed caption with surrounding space removed", () => {
    expect(normalizeCaption("  Evening wear  ")).toBe("Evening wear");
  });
  it("stores nothing when the caption is left blank", () => {
    expect(normalizeCaption("")).toBeNull();
    expect(normalizeCaption("   \n  ")).toBeNull();
    expect(normalizeCaption(null)).toBeNull();
  });
  it("shows no caption section for an item without a caption", () => {
    expect(hasCaption("")).toBe(false);
    expect(hasCaption("   ")).toBe(false);
    expect(hasCaption(null)).toBe(false);
  });
  it("shows the caption section when a caption exists", () => {
    expect(hasCaption("Suit")).toBe(true);
  });
});
