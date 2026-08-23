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
  // NOTE: do not pass "noopener" here. Browsers return null for noopener
  // windows, which would leave us with no handle and force a same-tab
  // fallback after the async call. We null out `opener` manually instead.
  const win = window.open("about:blank", "_blank");
  try {
    if (win) win.opener = null;
  } catch {
    /* cross-origin guard, safe to ignore */
  }
  return win;
}


/** Send the user to an external URL in a separate window. */
export function navigateExternal(url: string, pre?: Window | null): void {
  if (typeof window === "undefined") return;
  if (pre && !pre.closed) {
    pre.location.href = url;
    return;
  }
  let win: Window | null = null;
  try {
    win = window.open(url, "_blank");
    if (win) win.opener = null;
  } catch {
    win = null;
  }
  if (!win) {
    // Popup blocked: use a temporary anchor, which browsers allow more often
    // than window.open, before giving up and using the current tab.
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

}

/** Close a pre-opened window when the flow failed before we got a URL. */
export function closeExternalWindow(pre?: Window | null): void {
  if (pre && !pre.closed) pre.close();
}
