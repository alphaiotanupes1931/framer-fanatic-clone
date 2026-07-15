import { Link } from "@tanstack/react-router";
import { Clock, Heart, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { stripHtml, timeAgo } from "@/lib/text-utils";

type Story = {
  id: string;
  title: string;
  excerpt?: string | null;
  cover_url?: string | null;
  likes_count?: number | null;
  comments_count?: number | null;
  read_minutes?: number | null;
  author_name?: string;
  author_avatar?: string | null;
  category?: string | null;
  created_at?: string | null;
};

export function StoryCard({ story, featured = false }: { story: Story; featured?: boolean }) {
  const cleanExcerpt = stripHtml(story.excerpt);
  if (featured) {
    return (
      <Link to="/stories/$storyId" params={{ storyId: story.id }} className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm active:translate-y-0">
        <div className="flex items-center gap-2 px-4 pt-3">
          <Avatar className="h-7 w-7">
            <AvatarImage src={story.author_avatar ?? undefined} />
            <AvatarFallback className="bg-slate-100 text-[10px] font-bold text-slate-500">
              {story.author_name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs font-extrabold text-slate-800">{story.author_name}</span>
          {story.category && <Badge variant="secondary" className="h-5 rounded-full border-0 bg-slate-100 px-2 text-[10px] font-bold capitalize leading-none text-slate-600 hover:bg-slate-100">{story.category}</Badge>}
          {story.created_at && <span className="ml-auto text-[11px] text-slate-500">{timeAgo(story.created_at)}</span>}
        </div>
        <div className="relative mt-3 aspect-[2/1] overflow-hidden bg-muted">
          {story.cover_url ? (
            <img src={story.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/10 to-accent/10" />
          )}
        </div>
        <div className="p-5">
          <h2 className="line-clamp-2 font-serif text-xl font-bold text-foreground transition-colors group-hover:text-[#d4580a] break-words">{story.title}</h2>
          {cleanExcerpt && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground break-words">{cleanExcerpt}</p>}
          <div className="mt-3 text-[11px] text-slate-500">
            {story.read_minutes || 5} min read
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/stories/$storyId"
      params={{ storyId: story.id }}
      className="group flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <header className="flex items-center gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <Avatar className="h-11 w-11 shrink-0 sm:h-12 sm:w-12">
          <AvatarImage src={story.author_avatar ?? undefined} />
          <AvatarFallback className="bg-muted text-sm text-muted-foreground">
            {story.author_name?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
            <span className="truncate">{story.author_name || "Someone"}</span>
            {story.category && (
              <Badge variant="secondary" className="h-5 rounded-full border-0 bg-slate-100 px-2 text-[10px] font-bold capitalize leading-none text-slate-600 hover:bg-slate-100">
                {story.category}
              </Badge>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground sm:text-[13px]">
            {story.created_at ? timeAgo(story.created_at) : ""}
          </div>
        </div>
      </header>
      <div className="mt-3 aspect-[16/9] w-full overflow-hidden bg-muted">
        {story.cover_url ? (
          <img
            src={story.cover_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/10 to-accent/10" />
        )}
      </div>
      <div className="flex flex-1 flex-col px-4 py-3 sm:px-6 sm:py-4">
        <h3 className="line-clamp-2 font-serif text-[17px] font-bold leading-snug text-foreground transition-colors group-hover:text-[#d4580a] break-words sm:text-lg">
          {story.title}
        </h3>
        {cleanExcerpt && (
          <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-muted-foreground break-words sm:text-[15px]">
            {cleanExcerpt}
          </p>
        )}
      </div>
      <footer className="flex items-center gap-5 px-4 py-3 text-sm text-muted-foreground sm:gap-7 sm:px-6 sm:py-4">
        <span className="flex items-center gap-2"><Clock className="h-5 w-5" />{story.read_minutes || 5}m</span>
        <span className="flex items-center gap-2"><Heart className="h-5 w-5" />{story.likes_count || 0}</span>
        <span className="flex items-center gap-2"><MessageCircle className="h-5 w-5" />{story.comments_count || 0}</span>
      </footer>
    </Link>
  );
}