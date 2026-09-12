import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageBackButton({
  destination,
}: {
  destination: "events" | "festivals";
}) {
  const label = destination === "events" ? "Back to events" : "Back to festivals";
  const to = destination === "events" ? "/events" : "/festivals";

  return (
    <Button asChild variant="outline" size="sm" className="w-fit">
      <Link to={to} aria-label={label}>
        <ArrowLeft />
        {label}
      </Link>
    </Button>
  );
}