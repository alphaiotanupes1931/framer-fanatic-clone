import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type ExistingPage = { slug: string; name: string } | null;

/** Returns the owner's existing page of this type, if any. */
export function useExistingPage(kind: string, ownerId?: string) {
  const [page, setPage] = useState<ExistingPage>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (!ownerId) { setLoading(false); return; }
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("slug,name")
        .eq("owner_id", ownerId)
        .eq("type", kind)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setPage(data ? { slug: data.slug as string, name: (data.name as string) ?? "" } : null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [kind, ownerId]);
  return { page, loading };
}

export function ExistingPageNotice({ label, page }: { label: string; page: { slug: string; name: string } }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm">
      <p className="font-medium">You already have a {label} page.</p>
      <p className="mt-1 text-muted-foreground">
        Only one {label} page is allowed per account.
      </p>
      <Link
        to="/o/$slug"
        params={{ slug: page.slug }}
        className="mt-3 inline-flex items-center rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
      >
        Click here to go to {page.name || `your ${label} page`}
      </Link>
    </div>
  );
}