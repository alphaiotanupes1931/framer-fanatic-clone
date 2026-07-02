import { Link } from "@tanstack/react-router";
import { Clock, Heart, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
};

export function StoryCard({ story, featured = false }: { story: Story; featured?: boolean }) {
  if (featured) {
    return (
      <Link to="/stories/$storyId" params={{ storyId: story.id }} className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md active:translate-y-0">
        <div className="relative aspect-[2/1] overflow-hidden bg-muted">
          {story.cover_url ? (
            <img src={story.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/10 to-accent/10" />
          )}
          {story.category && (
            <Badge variant="secondary" className="absolute left-3 top-3 border-0 bg-black/50 text-xs capitalize text-white backdrop-blur-sm">
              {story.category}
            </Badge>
          )}
        </div>
        <div className="p-5">
          <h2 className="line-clamp-2 font-serif text-xl font-bold text-foreground transition-colors group-hover:text-[#d4580a]">{story.title}</h2>
          {story.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{story.excerpt}</p>}
          <div className="mt-4 flex items-center gap-3">
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarImage src={story.author_avatar ?? undefined} />
              <AvatarFallback className="bg-accent/10 text-[10px] text-accent-foreground sm:text-xs">
                {story.author_name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground sm:text-xs">
              <span className="truncate font-medium text-foreground">{story.author_name}</span>
              <span>·</span>
              <span>{story.read_minutes || 5} min</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to="/stories/$storyId" params={{ storyId: story.id }} className="group flex gap-3 rounded-xl border border-border bg-card p-3 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 sm:gap-4 sm:p-4">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={story.author_avatar ?? undefined} />
            <AvatarFallback className="bg-accent/10 text-[9px] text-accent-foreground">
              {story.author_name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-[11px] font-medium text-foreground sm:text-xs">{story.author_name}</span>
          {story.category && <Badge variant="secondary" className="text-[9px] capitalize sm:text-[10px]">{story.category}</Badge>}
        </div>
        <h3 className="line-clamp-2 font-serif text-sm font-semibold text-foreground transition-colors group-hover:text-[#d4580a]">{story.title}</h3>
        {story.excerpt && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground sm:text-xs">{story.excerpt}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground sm:text-xs">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{story.read_minutes || 5} min</span>
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{story.likes_count || 0}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{story.comments_count || 0}</span>
        </div>
      </div>
      {story.cover_url && (
        <div className="aspect-square h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-24">
          <img src={story.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
    </Link>
  );
}