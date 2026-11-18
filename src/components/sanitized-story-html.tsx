import { useEffect, useState } from "react";

/** Load the HTML sanitizer only in the browser, never its Node DOM emulator during SSR. */
export function SanitizedStoryHtml({ html, className }: { html: string; className?: string }) {
  const [result, setResult] = useState<{ source: string; clean: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import("isomorphic-dompurify").then(({ default: sanitizer }) => {
      const clean = sanitizer.sanitize(html);
      if (!cancelled) setResult({ source: html, clean });
    }).catch(() => { /* Never render unsanitized HTML when loading fails. */ });
    return () => { cancelled = true; };
  }, [html]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: result?.source === html ? result.clean : "" }} />;
}