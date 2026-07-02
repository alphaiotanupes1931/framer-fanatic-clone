import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, X } from "lucide-react";
import { EphemeralStory } from "@/lib/entities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CurrentUser } from "@/hooks/use-current-user";

type Story = {
  id: string;
  user_id: string;
  media_url: string;
  caption: string | null;
  expires_at: string;
  author_name?: string;
  author_avatar?: string | null;
};

type Group = {
  user_id: string;
  author_name?: string;
  author_avatar?: string | null;
  stories: Story[];
};

export function StoryBar({ currentUser }: { currentUser: CurrentUser | null }) {
  const [viewing, setViewing] = useState<Group | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["ephemeral-stories"],
    queryFn: () => EphemeralStory.list(100),
    refetchInterval: 60000,
  });

  const active = (data as Story[]).filter((s) => new Date(s.expires_at) > new Date());
  const groupedMap = new Map<string, Group>();
  active.forEach((s) => {
    const g = groupedMap.get(s.user_id) ?? { user_id: s.user_id, author_name: s.author_name, author_avatar: s.author_avatar, stories: [] };
    g.stories.push(s);
    groupedMap.set(s.user_id, g);
  });
  const groups = Array.from(groupedMap.values());
  const mine = groups.find((g) => g.user_id === currentUser?.id);
  const others = groups.filter((g) => g.user_id !== currentUser?.id);

  const handleUpload = async (file: File) => {
    if (!currentUser) { toast.error("Sign in first"); return; }
    setUploading(true);
    try {
      const path = `${currentUser.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await EphemeralStory.create({ media_url: data.publicUrl });
      qc.invalidateQueries({ queryKey: ["ephemeral-stories"] });
      toast.success("Story added");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="scrollbar-hide -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {/* Add-your-story button */}
        {currentUser && (
          <label className="flex flex-shrink-0 cursor-pointer flex-col items-center gap-1.5 focus:outline-none">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-dashed border-border bg-muted">
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Plus className="h-5 w-5" />
              </div>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ""; }}
                disabled={uploading}
              />
            </div>
            <span className="max-w-[64px] truncate text-center text-[11px] font-medium text-foreground">Your story</span>
          </label>
        )}

        {/* My existing stories */}
        {mine && mine.stories.length > 0 && (
          <button
            onClick={() => { setViewing(mine); setViewIndex(0); }}
            className="flex flex-shrink-0 flex-col items-center gap-1.5 focus:outline-none"
          >
            <div className="rounded-full bg-gradient-to-tr from-[#d4580a] via-orange-400 to-amber-300 p-[2px]">
              <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-card">
                <Avatar className="h-full w-full">
                  <AvatarImage src={mine.author_avatar ?? undefined} />
                  <AvatarFallback className="bg-[#d4580a]/10 text-lg font-bold text-[#d4580a]">
                    {mine.author_name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <span className="max-w-[64px] truncate text-center text-[11px] font-medium text-foreground">Your story</span>
          </button>
        )}

        {/* Other users' stories */}
        {others.map((g) => (
          <button
            key={g.user_id}
            onClick={() => { setViewing(g); setViewIndex(0); }}
            className="flex flex-shrink-0 flex-col items-center gap-1.5 focus:outline-none"
          >
            <div className="rounded-full bg-gradient-to-tr from-[#d4580a] via-orange-400 to-amber-300 p-[2px]">
              <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-card">
                <Avatar className="h-full w-full">
                  <AvatarImage src={g.author_avatar ?? undefined} />
                  <AvatarFallback className="bg-secondary text-lg font-semibold text-foreground">
                    {g.author_name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <span className="max-w-[64px] truncate text-center text-[11px] font-medium text-foreground">
              {g.author_name?.split(" ")[0] ?? "User"}
            </span>
          </button>
        ))}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black" onClick={() => setViewing(null)}>
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-md"
            onClick={(e) => { e.stopPropagation(); setViewing(null); }}
            aria-label="Close story"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex h-full max-h-[85vh] w-full max-w-md items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            {/* Progress dots */}
            <div className="absolute left-4 right-4 top-4 flex gap-1">
              {viewing.stories.map((_, i) => (
                <div key={i} className={`h-0.5 flex-1 rounded ${i === viewIndex ? "bg-white" : "bg-white/30"}`} />
              ))}
            </div>
            <button
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-1 text-white backdrop-blur-md disabled:opacity-30"
              onClick={() => setViewIndex((i) => Math.max(0, i - 1))}
              disabled={viewIndex === 0}
            >‹</button>
            <img src={viewing.stories[viewIndex].media_url} alt="" className="max-h-full max-w-full object-contain" />
            <button
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-1 text-white backdrop-blur-md disabled:opacity-30"
              onClick={() => setViewIndex((i) => Math.min(viewing.stories.length - 1, i + 1))}
              disabled={viewIndex === viewing.stories.length - 1}
            >›</button>
            {viewing.stories[viewIndex].caption && (
              <div className="absolute bottom-6 left-4 right-4 rounded-lg bg-black/60 p-3 text-center text-white backdrop-blur-md">
                {viewing.stories[viewIndex].caption}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}