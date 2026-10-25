import { describe, expect, it } from "vitest";
import { businessOfferTabs } from "./business-offers";
import { BUSINESS_OFFERS } from "./categories";

describe("business offers", () => {
  it("allows Product, Service or Both", () => {
    expect([...BUSINESS_OFFERS]).toEqual(["Product", "Service", "Both"]);
  });
  it("shows only Products for Product", () => {
    expect(businessOfferTabs("Product")).toEqual(["Products"]);
  });
  it("shows only Services for Service", () => {
    expect(businessOfferTabs("Service")).toEqual(["Services"]);
  });
  it("shows Products and Services for Both", () => {
    expect(businessOfferTabs("Both")).toEqual(["Products", "Services"]);
  });
  it("keeps the existing Services tab for an unset offer without assigning one", () => {
    expect(businessOfferTabs(null)).toEqual(["Services"]);
  });
});