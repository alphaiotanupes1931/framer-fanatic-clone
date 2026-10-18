import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SmartAvatarImage } from "@/components/shared/smart-img";
import { invalidateConnections } from "@/lib/connections";
import { chooseFollowMode } from "@/components/shared/follow-mode-dialog";
import { titleCase } from "@/lib/utils";

type Host = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

/**
 * Shown right after someone RSVPs or buys a ticket. Invites them to follow the
 * organizer so they hear about future events. Stays hidden if the guest is the
 * organizer or already follows them.
 */
export function FollowOrganizerDialog({ eventId, me, open, onOpenChange }: {
  eventId: string | null;
  me: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [host, setHost] = useState<Host | null>(null);
  const [eventName, setEventName] = useState("");
  const [ready, setReady] = useState(false);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !eventId || !me) { setReady(false); return; }
    let cancelled = false;
    (async () => {
      const { data: ev } = await supabase.from("events").select("title, user_id").eq("id", eventId).maybeSingle();
      const hostId = (ev as { user_id?: string } | null)?.user_id;
      if (!ev || !hostId || hostId === me) { if (!cancelled) onOpenChange(false); return; }
      const [{ data: h }, { data: f }] = await Promise.all([
        (supabase as any).from("profiles_public").select("id, display_name, username, avatar_url").eq("id", hostId).maybeSingle(),
        supabase.from("follows").select("follower_id").eq("follower_id", me).eq("following_id", hostId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (!h || f) { onOpenChange(false); return; }
      setHost(h as Host);
      setEventName((ev as { title?: string }).title || "this event");
      setFollowing(false);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [open, eventId, me, onOpenChange]);

  const follow = async () => {
    if (!host || !me || busy) return;
    const mode = await chooseFollowMode();
    if (!mode) return;
    setBusy(true);
    const { error } = await supabase.from("follows").insert({ follower_id: me, following_id: host.id, allow_dms: mode.allowDms } as never);
    setBusy(false);
    if (error && !/duplicate/i.test(error.message)) { toast.error(error.message); return; }
    invalidateConnections();
    setFollowing(true);
    toast.success(`You're following ${name}`);
    setTimeout(() => onOpenChange(false), 900);
  };

  const name = titleCase(host?.display_name || host?.username || "the organizer");

  return (
    <Dialog open={open && ready} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-sm rounded-2xl text-center">
        <DialogHeader className="items-center text-center">
          <Avatar className="mb-2 h-16 w-16">
            <SmartAvatarImage src={host?.avatar_url ?? undefined} alt="" />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <DialogTitle className="text-center">You're all set!</DialogTitle>
          <DialogDescription className="text-center">
            Follow {name}, the organizer of {eventName}, to keep up with all their events.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          <Button onClick={follow} disabled={busy || following} className="gap-2">
            {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {following ? "Following" : `Follow ${name}`}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Not now</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
