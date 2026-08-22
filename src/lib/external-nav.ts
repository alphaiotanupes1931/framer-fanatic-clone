/**
 * Helpers for sending people to sites outside Planet Baltimore (Stripe checkout,
 * payout onboarding, etc). These always open a separate window/tab so the
 * platform stays open behind them.
 */

/**
 * Call this synchronously inside a click handler before any await, so the
 * browser does not treat the later open as a blocked popup.
 */
export function openExternalWindow(): Window | null {
  if (typeof window === "undefined") return null;
  return window.open("about:blank", "_blank", "noopener,noreferrer");
}

/** Send the user to an external URL in a separate window. */
export function navigateExternal(url: string, pre?: Window | null): void {
  if (typeof window === "undefined") return;
  if (pre && !pre.closed) {
    pre.location.href = url;
    return;
  }
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) window.location.href = url; // popup blocked: fall back to same tab
}

/** Close a pre-opened window when the flow failed before we got a URL. */
export function closeExternalWindow(pre?: Window | null): void {
  if (pre && !pre.closed) pre.close();
}
