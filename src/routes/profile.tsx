import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, MapPin, Pencil, Share2, UserPlus, MessageCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile - Planet Baltimore" }] }),
});

const TABS = ["Posts","Feed","My Writings","Saved","Attending","Organized","My Tickets","My Pages"] as const;
type Tab = (typeof TABS)[number];

function ProfilePage() {
  const profile = useCurrentProfile();
  const [tab, setTab] = useState<Tab>("Posts");
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ count: posts }, { count: followers }, { count: following }] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id),
      ]);
      setStats({ posts: posts || 0, followers: followers || 0, following: following || 0 });
    })();
  }, [profile]);

  const uploadBanner = async (file: File) => {
    if (!profile) return;
    const path = `${profile.id}/banner-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ banner_url: data.publicUrl }).eq("id", profile.id);
    toast.success("Banner updated"); location.reload();
  };

  const initials = (profile?.display_name || profile?.email || "U").slice(0, 2).toUpperCase();

  return (
    <AppLayout title="" hero={false}>
      <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden">
        <div
          className="relative h-56 bg-gradient-to-br from-neutral-200 to-neutral-300"
          style={profile?.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          <label className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white hover:bg-black/80">
            <Camera className="h-3.5 w-3.5" /> {profile?.banner_url ? "Change banner" : "Add banner"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadBanner(e.target.files[0])} />
          </label>
        </div>

        <div className="relative px-6 pb-6">
          <div className="-mt-12 flex items-end justify-between gap-4">
            <Avatar className="h-24 w-24 ring-4 ring-white">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-orange-100 text-2xl text-orange-700">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <button className="rounded-full bg-orange-100 p-2.5 text-orange-700 hover:bg-orange-200"><BookOpen className="h-4 w-4" /></button>
              <button className="rounded-full bg-orange-100 p-2.5 text-orange-700 hover:bg-orange-200">+</button>
              <Link to="/settings" className="rounded-full bg-neutral-100 p-2.5 hover:bg-neutral-200"><Pencil className="h-4 w-4" /></Link>
              <button className="rounded-full bg-neutral-100 p-2.5 hover:bg-neutral-200"><MessageCircle className="h-4 w-4" /></button>
              <button className="rounded-full bg-neutral-100 p-2.5 hover:bg-neutral-200"><UserPlus className="h-4 w-4" /></button>
              <button className="rounded-full bg-neutral-100 p-2.5 hover:bg-neutral-200"><Share2 className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 text-xl font-bold">{profile?.username || profile?.display_name}</div>
            <button className="mt-1 flex items-center gap-1 text-sm text-neutral-500 hover:text-orange-600">
              <MapPin className="h-3.5 w-3.5" /> {profile?.neighborhood || "Add neighborhood"}
            </button>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium capitalize">
              {profile?.role || "attendee"}
            </span>
          </div>

          <div className="mt-5 flex gap-8 text-sm">
            <div><div className="text-lg font-bold">{stats.posts}</div><div className="text-neutral-500">Posts</div></div>
            <div><div className="text-lg font-bold">{stats.followers}</div><div className="text-neutral-500">Followers</div></div>
            <div><div className="text-lg font-bold">{stats.following}</div><div className="text-neutral-500">Following</div></div>
            <div><div className="text-lg font-bold">0</div><div className="text-neutral-500">Referrals</div></div>
          </div>

          <div className="mt-6 flex gap-1 overflow-x-auto border-b border-neutral-200">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition ${tab===t ? "border-orange-600 text-orange-600" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="py-16 text-center text-neutral-500">
            No {tab.toLowerCase()} yet. Share something with the community!
          </div>
        </div>
      </div>
    </AppLayout>
  );
}