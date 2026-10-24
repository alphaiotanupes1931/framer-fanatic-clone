import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Link2, RemoveFormatting,
} from "lucide-react";

const tbBtn =
  "h-8 w-8 rounded-md p-0 text-foreground hover:bg-transparent hover:text-foreground";

export interface RichTextEditorProps {
  value: string; // HTML
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

/** Shared rich text editor with a formatting toolbar. Value is sanitized-ish HTML. */
export function RichTextEditor({ value, onChange, placeholder, minHeight = 140, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync external value into the editable area only when it differs
  // (avoids clobbering the caret while typing).
  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== (value || "")) el.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const exec = (cmd: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const insertLink = () => {
    const url = window.prompt("Link URL");
    if (!url) return;
    exec("createLink", url);
  };

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-background ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted p-1.5" onMouseDown={(e) => { if ((e.target as HTMLElement).closest("button")) e.preventDefault(); }}>
        <select
          onChange={(e) => { exec("formatBlock", e.target.value); e.currentTarget.value = "p"; }}
          defaultValue="p"
          aria-label="Text style"
          className="h-8 rounded-md border border-transparent bg-transparent px-2 text-sm text-foreground"
        >
          <option value="p">Normal</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
        </select>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button variant="ghost" type="button" title="Bold" aria-label="Bold" className={tbBtn} onClick={() => exec("bold")}><Bold className="h-4 w-4" /></Button>
        <Button variant="ghost" type="button" title="Italic" aria-label="Italic" className={tbBtn} onClick={() => exec("italic")}><Italic className="h-4 w-4" /></Button>
        <Button variant="ghost" type="button" title="Underline" aria-label="Underline" className={tbBtn} onClick={() => exec("underline")}><Underline className="h-4 w-4" /></Button>
        <Button variant="ghost" type="button" title="Strikethrough" aria-label="Strikethrough" className={tbBtn} onClick={() => exec("strikeThrough")}><Strikethrough className="h-4 w-4" /></Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button variant="ghost" type="button" title="Numbered list" aria-label="Numbered list" className={tbBtn} onClick={() => exec("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
        <Button variant="ghost" type="button" title="Bulleted list" aria-label="Bulleted list" className={tbBtn} onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></Button>
        <Button variant="ghost" type="button" title="Quote" aria-label="Quote" className={tbBtn} onClick={() => exec("formatBlock", "blockquote")}><Quote className="h-4 w-4" /></Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button variant="ghost" type="button" title="Link" aria-label="Link" className={tbBtn} onClick={insertLink}><Link2 className="h-4 w-4" /></Button>
        <Button variant="ghost" type="button" title="Clear formatting" aria-label="Clear formatting" className={tbBtn} onClick={() => exec("removeFormat")}><RemoveFormatting className="h-4 w-4" /></Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-label="Content"
        aria-multiline="true"
        suppressContentEditableWarning
        data-placeholder={placeholder ?? "Write your message..."}
        onInput={emit}
        onBlur={emit}
        style={{ minHeight }}
        className="prose prose-sm max-w-none p-4 text-sm leading-relaxed text-foreground [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic focus:outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}

/** Convert editor HTML to readable plain text with paragraph breaks preserved (for mailto / plain emails). */
export function richHtmlToPlainText(html: string): string {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  // Turn block boundaries into newlines before reading textContent
  div.querySelectorAll("br").forEach((el) => el.replaceWith("\n"));
  div.querySelectorAll("p,div,li,blockquote,h1,h2,h3,h4,pre").forEach((el) => {
    el.append("\n");
    if (el.tagName === "LI") el.prepend("• ");
  });
  return (div.textContent ?? "").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
}

/** True when the HTML has no visible text. */
export function richHtmlIsEmpty(html: string): boolean {
  return !html || html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;
}
