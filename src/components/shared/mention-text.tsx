import { Fragment } from "react";
import { Link } from "@tanstack/react-router";

const TOKEN_RE =
  /(https?:\/\/[^\s<]+|www\.[^\s<]+|[a-z0-9-]+(?:\.[a-z0-9-]+)+\/[^\s<]*)|@([a-zA-Z0-9][a-zA-Z0-9_.-]{1,29})/gi;

const TRAILING = /[.,;:!?)\]}'"]+$/;

/**
 * Renders plain text with @username mentions turned into profile links.
 */
export function MentionText({ text, className = "" }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(<Fragment key={`t${last}`}>{text.slice(last, m.index)}</Fragment>);
    if (m[1]) {
      // URL in the caption: make it a real clickable hyperlink.
      const raw = m[1].replace(TRAILING, "");
      const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      parts.push(
        <a
          key={`u${m.index}`}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-blue-600 underline underline-offset-2 decoration-2 break-words hover:text-blue-700 dark:text-blue-400"
        >
          {raw}
        </a>,
      );
      last = m.index + raw.length;
    } else {
      const username = m[2].replace(/[.]+$/, "");
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
    TOKEN_RE.lastIndex = last;
  }
  if (last < text.length) parts.push(<Fragment key={`t${last}`}>{text.slice(last)}</Fragment>);
  // Posts are written with line breaks and blank lines; preserve them everywhere
  // so text looks identical on every page that renders it.
  return <span className={`whitespace-pre-wrap break-words ${className}`}>{parts}</span>;
}
