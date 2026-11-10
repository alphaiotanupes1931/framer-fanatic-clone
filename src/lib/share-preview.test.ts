import { describe, expect, it } from "vitest";
import { encodeSharePreview, parseSharePreview, shareText } from "./share-preview";

describe("shared item previews in messages", () => {
  it("never shows formatting code from an event description", () => {
    expect(shareText('<div class="x" style="color: red">Come join us!&nbsp;<br><br>The Lounge</div>')).toBe("Come join us! The Lounge");
  });

  it("cleans previews that were already sent with formatting code", () => {
    const raw = '::share::{"type":"event","id":"e1","url":"/events/e1","title":"Party","excerpt":"<p>Hi &amp; welcome</p>"}';
    expect(parseSharePreview(raw)?.preview.excerpt).toBe("Hi & welcome");
  });

  it("stores clean text when sharing", () => {
    const sent = encodeSharePreview({ type: "event", id: "e1", url: "/events/e1", excerpt: "<b>Bold</b> news" });
    expect(sent).not.toContain("<b>");
    expect(parseSharePreview(sent)?.preview.excerpt).toBe("Bold news");
  });
});
