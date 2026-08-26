/** Renders user-authored rich text HTML (from RichTextEditor) with safe styling. */
export function RichHtml({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm prose-neutral max-w-none leading-relaxed [&_a]:text-[#d4580a] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-200 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
