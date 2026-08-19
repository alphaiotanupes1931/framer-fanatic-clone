import { useState } from "react";
import { Flag } from "lucide-react";
import { ReportDialog } from "@/components/report-dialog";

type ContentType = "post" | "story" | "comment" | "user" | "event" | "message";

/**
 * Small flag button that any content card can render so members can report
 * abusive or suspicious content.
 */
export function ReportButton({
  contentType,
  contentId,
  className = "",
  label,
}: {
  contentType: ContentType;
  contentId: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Report this content"
        title="Report this content"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={`flex items-center gap-1.5 text-muted-foreground transition hover:text-red-600 ${className}`}
      >
        <Flag className="h-[18px] w-[18px]" />
        {label && <span className="text-xs font-medium">{label}</span>}
      </button>
      <ReportDialog open={open} onClose={() => setOpen(false)} contentType={contentType} contentId={contentId} />
    </>
  );
}
