import { useState } from "react";
import { Send, Share2 } from "lucide-react";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { externalShare, type SharePreview } from "@/lib/share-preview";

/**
 * The platform-wide share control pair.
 *
 *  - paper airplane  -> share INSIDE Planet Baltimore (DM with a rich preview)
 *  - share arrow     -> share OUTSIDE the platform (native share sheet / copy)
 *
 * `path` is the app-relative route for the thing being shared, e.g. "/o/my-org".
 */
export function ShareButtons({
  path,
  title,
  preview,
  size = "md",
  className = "",
  label,
}: {
  path: string;
  title?: string | null;
  preview?: SharePreview;
  size?: "sm" | "md";
  className?: string;
  label?: boolean;
}) {
  const [openInApp, setOpenInApp] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}${path}`;
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const btn =
    "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        className={btn}
        onClick={() => setOpenInApp(true)}
        aria-label="Share on Planet Baltimore"
        title="Share on Planet Baltimore"
      >
        <Send className={`${icon} -rotate-45`} />
        {label && <span>Share in app</span>}
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => void externalShare(url, title || undefined)}
        aria-label="Share outside Planet Baltimore"
        title="Share outside Planet Baltimore"
      >
        <Share2 className={icon} />
        {label && <span>Share</span>}
      </button>

      <ShareToUsersDialog
        open={openInApp}
        onClose={() => setOpenInApp(false)}
        url={url}
        title={title || undefined}
        preview={preview}
      />
    </div>
  );
}