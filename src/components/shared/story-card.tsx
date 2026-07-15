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
    <Link to="/stories/$storyId" params={{ storyId: story.id }} className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Avatar className="h-7 w-7">
          <AvatarImage src={story.author_avatar ?? undefined} />
          <AvatarFallback className="bg-slate-100 text-[10px] font-bold text-slate-500">
            {story.author_name?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-xs font-extrabold text-slate-800">{story.author_name}</span>
        {story.category && <Badge variant="secondary" className="h-5 rounded-full border-0 bg-slate-100 px-2 text-[10px] font-bold capitalize leading-none text-slate-600 hover:bg-slate-100">{story.category}</Badge>}
      </div>
      {story.cover_url ? (
        <div className="mt-3 aspect-[16/9] w-full overflow-hidden bg-muted">
          <img src={story.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : null}
      <div className="p-4">
        <h3 className="line-clamp-2 font-serif text-lg font-extrabold leading-snug text-slate-950 transition-colors group-hover:text-[#d4580a] break-words">{story.title}</h3>
        {cleanExcerpt && <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-slate-500 break-words">{cleanExcerpt}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs leading-none text-slate-500">
          {story.created_at && <span>{timeAgo(story.created_at)}</span>}
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{story.read_minutes || 5} min read</span>
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{story.likes_count || 0}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{story.comments_count || 0}</span>
        </div>
      </div>
    </Link>
  );
}