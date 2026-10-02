import type { ComponentProps, ReactNode } from "react";
import { Link } from "@tanstack/react-router";

type PageLinkProps = Omit<ComponentProps<typeof Link>, "to" | "params" | "children"> & {
  type: string | null | undefined;
  slug: string;
  children: ReactNode;
};

/** Type-safe link to the canonical short URL for any page kind. */
export function OrgLink({ type, slug, children, ...props }: PageLinkProps) {
  if (type === "artist") return <Link {...props} to="/a/$slug" params={{ slug }}>{children}</Link>;
  if (type === "arts_org") return <Link {...props} to="/ao/$slug" params={{ slug }}>{children}</Link>;
  if (type === "business") return <Link {...props} to="/b/$slug" params={{ slug }}>{children}</Link>;
  if (type === "community_assoc") return <Link {...props} to="/ca/$slug" params={{ slug }}>{children}</Link>;
  if (type === "group") return <Link {...props} to="/g/$slug" params={{ slug }}>{children}</Link>;
  if (type === "resident") return <Link {...props} to="/r/$slug" params={{ slug }}>{children}</Link>;
  if (type === "visitor") return <Link {...props} to="/v/$slug" params={{ slug }}>{children}</Link>;
  return <Link {...props} to="/o/$slug" params={{ slug }}>{children}</Link>;
}