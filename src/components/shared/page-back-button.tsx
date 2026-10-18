import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageBackButton({
  destination,
  to,
  label,
}: {
  destination?: "events" | "festivals";
  to?: string;
  label?: string;
}) {
  const router = useRouter();
  const hasDestination = to !== undefined || destination !== undefined;
  const resolvedLabel = label ?? (destination === "events" ? "Back to events" : "Back to festivals");
  const resolvedTo = to ?? (destination === "events" ? "/events" : "/festivals");

  if (!hasDestination) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => router.history.back()}
        aria-label="Back"
      >
        <ArrowLeft />
        Back
      </Button>
    );
  }

  // Always return to the page the person came from; the fixed destination is
  // only used when there is no earlier page (opened from a shared link).
  return (
    <Button asChild variant="outline" size="sm" className="w-fit">
      <Link
        to={resolvedTo}
        aria-label="Back"
        onClick={(e) => {
          if (window.history.length > 1) { e.preventDefault(); router.history.back(); }
        }}
      >
        <ArrowLeft />
        Back
      </Link>
    </Button>
  );
}