import { Fragment } from "react";
import { Link } from "@tanstack/react-router";

const MENTION_RE = /@([a-zA-Z0-9][a-zA-Z0-9_.-]{1,29})/g;

/**
 * Renders plain text with @username mentions turned into profile links.
 */
export function MentionText({ text, className = "" }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(<Fragment key={`t${last}`}>{text.slice(last, m.index)}</Fragment>);
    const username = m[1].replace(/[.]+$/, "");
    parts.push(
      <Link
        key={`m${m.index}`}
        to="/u/$username"
        params={{ username }}
        onClick={(e) => e.stopPropagation()}
        className="font-semibold text-[#d4580a] hover:underline"
      >
        @{username}
      </Link>,
    );
    last = m.index + 1 + username.length;
  }
  if (last < text.length) parts.push(<Fragment key={`t${last}`}>{text.slice(last)}</Fragment>);
  return <span className={className}>{parts}</span>;
}
