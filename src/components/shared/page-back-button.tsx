import { Link } from "@tanstack/react-router";
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
  const resolvedLabel = label ?? (destination === "events" ? "Back to events" : "Back to festivals");
  const resolvedTo = to ?? (destination === "events" ? "/events" : "/festivals");

  return (
    <Button asChild variant="outline" size="sm" className="w-fit">
      <Link to={resolvedTo} aria-label={resolvedLabel}>
        <ArrowLeft />
        {resolvedLabel}
      </Link>
    </Button>
  );
}