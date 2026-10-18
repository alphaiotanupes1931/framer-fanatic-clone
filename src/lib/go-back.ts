import type { MouseEvent } from "react";

/** Back links return to the previous page; their href is only a fallback. */
export function goBackOnClick(e: MouseEvent) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    e.preventDefault();
    window.history.back();
  }
}
