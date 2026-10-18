import { describe, expect, it } from "vitest";
import { parseReferralEmails, removeReferralEmails, referralRecipientsKey } from "./referral-recipients";

describe("referral recipients", () => {
  it("parses all recipients from the latest send, including lists longer than twenty", () => {
    const emails = Array.from({ length: 35 }, (_, i) => `person${i}@example.com`);
    expect(parseReferralEmails(emails.join(", "))).toEqual(emails);
  });
  it("removes an email from the source so parsing cannot bring it back", () => {
    const edited = removeReferralEmails("FIRST@example.com, second@example.com, first@example.com", ["first@example.com"]);
    expect(parseReferralEmails(edited)).toEqual(["second@example.com"]);
    expect(parseReferralEmails(JSON.parse(JSON.stringify(edited)))).toEqual(["second@example.com"]);
  });
  it("keeps saved recipient lists separate for each account", () => {
    expect(referralRecipientsKey("first")).not.toBe(referralRecipientsKey("second"));
  });
});