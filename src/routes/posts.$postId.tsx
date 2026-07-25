import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { PostSplitView } from "@/components/shared/post-split-view";

export const Route = createFileRoute("/posts/$postId")({
  component: PostDetail,
  head: () => ({ meta: [{ title: "Post - Planet Baltimore" }] }),
});

function PostDetail() {
  const { postId } = Route.useParams();
  const me = useCurrentProfile();
  const navigate = useNavigate();

  return (
    <AppLayout title="" hero={false}>
      <div className="mx-auto max-w-5xl">
        <button onClick={() => navigate({ to: "/dashboard" })} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <PostSplitView postId={postId} meId={me?.id} onDeleted={() => navigate({ to: "/dashboard" })} />
        </div>
      </div>
    </AppLayout>
  );
}