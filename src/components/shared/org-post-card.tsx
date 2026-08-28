import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Img, SmartAvatarImage, SmartVideo } from "@/components/shared/smart-img";
import { timeAgo } from "@/lib/text-utils";

export type OrgFeedPost = {
  id: string;
  org_id: string;
  org_name: string;
  org_slug: string;
  org_avatar: string | null;
  title: string | null;
  body: string | null;
  media_url: string | null;
  media_urls: string[] | null;
  video_url: string | null;
  created_at: string;
};

/** A page (organization) post shown inside the main "On Planet" feed. */
export function OrgPostCard({ post }: { post: OrgFeedPost }) {
  const media = (post.media_urls && post.media_urls.length ? post.media_urls : [post.media_url].filter(Boolean)) as string[];
  const first = media[0];
  const initial = (post.org_name || "P").slice(0, 1).toUpperCase();
  const orgPath = { to: "/o/$slug" as const, params: { slug: post.org_slug } };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-200 hover:shadow-md">
      {post.video_url ? (
        <SmartVideo src={post.video_url} className="max-h-[560px] w-full bg-black object-contain" controls />
      ) : first ? (
        <Link {...orgPath}>
          <Img src={first} alt={post.title || post.org_name} className="max-h-[560px] w-full object-cover" />
        </Link>
      ) : null}

      <header className="mx-4 mb-1 mt-3 flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3 sm:mx-6">
        <Link {...orgPath} className="shrink-0">
          <Avatar className="h-11 w-11 sm:h-12 sm:w-12">
            {post.org_avatar && <SmartAvatarImage src={post.org_avatar} />}
            <AvatarFallback className="bg-muted text-sm text-muted-foreground">{initial}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0">
          <Link {...orgPath} className="block truncate text-sm font-semibold hover:underline">
            {post.org_name}
          </Link>
          <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
        </div>
      </header>

      <div className="px-5 pb-5 sm:px-7">
        {post.title && <h3 className="mb-1 text-base font-semibold">{post.title}</h3>}
        {post.body && <p className="max-h-[60vh] overflow-y-auto overscroll-contain whitespace-pre-wrap break-words text-sm text-foreground/90">{post.body}</p>}
        <Link {...orgPath} className="mt-3 inline-block text-xs font-semibold text-[#d4580a] hover:underline">
          View on {post.org_name}
        </Link>
      </div>
    </article>
  );
}
