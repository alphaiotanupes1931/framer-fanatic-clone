import { describe, expect, it } from "vitest";
import { activeCalendarOrganizer, matchesCalendarOrganizer } from "./calendar-filters";

describe("calendar organizer dropdowns", () => {
  it("uses Monthly Calendar's own selection", () => {
    expect(activeCalendarOrganizer("monthly", "artist", "business")).toBe("artist");
  });
  it("uses Upcoming's selection independently", () => {
    expect(activeCalendarOrganizer("upcoming", "artist", "business")).toBe("business");
  });
  it("All includes events from every page type and personal profiles", () => {
    expect(["artist", "business", "arts_org", "group", null].every((type) => matchesCalendarOrganizer("all", type))).toBe(true);
  });
  it("Businesses includes business events only", () => {
    expect(matchesCalendarOrganizer("business", "business")).toBe(true);
    expect(matchesCalendarOrganizer("business", "artist")).toBe(false);
  });
  it("Artists includes artist events only", () => {
    expect(matchesCalendarOrganizer("artist", "artist")).toBe(true);
    expect(matchesCalendarOrganizer("artist", "business")).toBe(false);
  });
  it("Arts Orgs includes arts organization events only", () => {
    expect(matchesCalendarOrganizer("arts", "arts_org")).toBe(true);
    expect(matchesCalendarOrganizer("arts", "artist")).toBe(false);
  });
});