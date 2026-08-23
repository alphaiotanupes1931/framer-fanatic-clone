import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type ExistingPage = { slug: string; name: string } | null;

/** Returns the owner's existing page of this type, if any. */
export function useExistingPage(kind: string, ownerId?: string) {
  const [page, setPage] = useState<ExistingPage>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const refetch = () => setRefresh((n) => n + 1);
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
  }, [kind, ownerId, refresh]);
  return { page, loading, refetch };
}

export function ExistingPageNotice({ label, page }: { label: string; page: { slug: string; name: string } }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const deletePage = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete your ${label} page? This cannot be undone.`);
    if (!confirmed) return;
    setDeleting(true);
    const { error } = await supabase.from("organizations").delete().eq("slug", page.slug);
    setDeleting(false);
    if (error) {
      toast.error(error.message || "Could not delete page");
      return;
    }
    toast.success(`${label} page deleted`);
    await router.invalidate();
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm">
      <p className="font-medium">You already have a {label} page.</p>
      <p className="mt-1 text-muted-foreground">
        Only one {label} page is allowed per account.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/o/$slug"
          params={{ slug: page.slug }}
          className="inline-flex items-center rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
        >
          Go to {page.name || `your ${label} page`}
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={deletePage}
          disabled={deleting}
          className="inline-flex items-center gap-1.5"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete {label} page
        </Button>
      </div>
    </div>
  );
}