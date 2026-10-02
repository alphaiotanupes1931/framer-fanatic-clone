import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

type PageLinkProps = {
  type: string | null | undefined;
  slug: string;
  children: ReactNode;
  className?: string;
};

/** Type-safe link to the canonical short URL for any page kind. */
export function OrgLink({ type, slug, children, className }: PageLinkProps) {
  if (type === "artist") return <Link className={className} to="/a/$slug" params={{ slug }}>{children}</Link>;
  if (type === "arts_org") return <Link className={className} to="/ao/$slug" params={{ slug }}>{children}</Link>;
  if (type === "business") return <Link className={className} to="/b/$slug" params={{ slug }}>{children}</Link>;
  if (type === "community_assoc") return <Link className={className} to="/ca/$slug" params={{ slug }}>{children}</Link>;
  if (type === "group") return <Link className={className} to="/g/$slug" params={{ slug }}>{children}</Link>;
  if (type === "resident") return <Link className={className} to="/r/$slug" params={{ slug }}>{children}</Link>;
  if (type === "visitor") return <Link className={className} to="/v/$slug" params={{ slug }}>{children}</Link>;
  return <Link className={className} to="/o/$slug" params={{ slug }}>{children}</Link>;
}