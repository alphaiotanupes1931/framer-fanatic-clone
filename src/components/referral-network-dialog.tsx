"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Gift,
  Copy,
  Check,
  Link2,
  Mail,
  Users,
  UserCheck,
  Loader2,
  Crown,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ReferralNetworkDialogProps {
  open: boolean;
  onClose: () => void;
  profile?: {
    id?: string;
    username?: string | null;
    display_name?: string | null;
  } | null;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const TIERS = [
  {
    level: 1,
    points: 5,
    label: "Direct invite",
    description: "You get 5 points for every friend who joins.",
  },
  {
    level: 2,
    points: 3,
    label: "Their invite",
    description: "When your friends invite others, you earn 3 points.",
  },
  {
    level: 3,
    points: 1,
    label: "Extended chain",
    description: "Their friends invite more people, you still get 1 point.",
  },
];

export function ReferralNetworkDialog({
  open,
  onClose,
  profile,
}: ReferralNetworkDialogProps) {
  const [tab, setTab] = useState("link");
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ total: 0, joined: 0, points: 0 });
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = `${window.location.origin}/invite`;
    return profile?.username ? `${base}?ref=${profile.username}` : base;
  }, [profile?.username]);

  const defaultMessage = useMemo(() => {
    const name = profile?.display_name || profile?.username || "me";
    return `Hey! I thought you would love Planet Baltimore. Join through my link and we both get points toward perks.`;
  }, [profile?.display_name, profile?.username]);

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage);
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadStats = async () => {
    setLoadingInvites(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingInvites(false);
      return;
    }
    const [invitesRes, joinedRes] = await Promise.all([
      supabase
        .from("invites")
        .select("id, email, created_at")
        .eq("invited_by", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", user.id),
    ]);
    const inviteRows = invitesRes.data ?? [];
    const joined = joinedRes.count ?? 0;
    setInvites(inviteRows);
    setStats({ total: inviteRows.length, joined, points: joined * 5 });
    setLoadingInvites(false);
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleSendInvite = async () => {
    const emails = Array.from(new Set((email.match(EMAIL_RE) || []).map((e) => e.toLowerCase())));
    if (emails.length === 0) {
      toast.error("Please enter at least one valid email");
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = emails.map((e) => ({
        email: e,
        invited_by: user?.id ?? null,
        invite_url: inviteUrl,
      }));
      const { error } = await supabase.from("invites").insert(rows);
      if (error && !error.message.includes("does not exist")) throw error;
      toast.success(`Invited ${emails.length} friend${emails.length === 1 ? "" : "s"}`);
      setEmail("");
      loadStats();
    } catch (err: any) {
      toast.error(err.message || "Could not send invite");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setTab("link");
    setEmail("");
    setMessage(defaultMessage);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[min(95vw,720px)] max-w-none max-h-[90vh] overflow-hidden p-0 gap-0">
        <div className="flex max-h-[85vh] flex-col">
          <div className="relative bg-gradient-to-br from-primary to-primary/85 p-4 pr-12 text-primary-foreground sm:p-5 sm:pr-14">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full bg-white/20 p-1.5 text-primary-foreground transition hover:bg-white/30"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader className="pb-1 space-y-0">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-primary-foreground sm:text-lg">
                <Gift className="h-4 w-4 sm:h-5 sm:w-5" /> Your Referral Network
              </DialogTitle>
            </DialogHeader>
            <p className="mt-1 text-xs text-primary-foreground/90 sm:text-sm">
              Invite friends and earn points at every level of the chain.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* How it works */}
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              How it works
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {TIERS.map((tier) => (
                <div
                  key={tier.level}
                  className="relative rounded-lg border border-border bg-card p-2 pt-3 text-center"
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
                    T{tier.level}
                  </div>
                  <div className="text-lg font-bold text-primary sm:text-xl">
                    +{tier.points}
                  </div>
                  <div className="text-[10px] font-semibold text-foreground sm:text-xs">
                    {tier.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground sm:text-xs">
                <Users className="h-3 w-3" /> Invited
              </div>
              <div className="mt-0.5 text-lg font-bold text-foreground sm:text-xl">{stats.total}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground sm:text-xs">
                <UserCheck className="h-3 w-3" /> Joined
              </div>
              <div className="mt-0.5 text-lg font-bold text-foreground sm:text-xl">{stats.joined}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground sm:text-xs">
                <Crown className="h-3 w-3" /> Points
              </div>
              <div className="mt-0.5 text-lg font-bold text-primary sm:text-xl">{stats.points}</div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="link" className="flex-1 gap-1.5 text-xs sm:text-sm">
                <Link2 className="h-3.5 w-3.5" /> Share Link
              </TabsTrigger>
              <TabsTrigger value="email" className="flex-1 gap-1.5 text-xs sm:text-sm">
                <Mail className="h-3.5 w-3.5" /> Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="mt-3 space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Your personal referral link
                </label>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-background px-2 py-2 text-xs text-muted-foreground">
                    <span className="block truncate">{inviteUrl || "..."}</span>
                  </div>
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 border-primary text-primary hover:bg-primary/10"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Anyone who signs up through this link counts toward your network.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `Join me on Planet Baltimore! ${inviteUrl}`;
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}&quote=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted transition sm:text-sm"
                >
                  Facebook
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `Join me on Planet Baltimore! ${inviteUrl}`;
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`, "_blank");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted transition sm:text-sm"
                >
                  LinkedIn
                </button>
              </div>
            </TabsContent>

            <TabsContent value="email" className="mt-3 space-y-3">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Email address
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="friend@example.com"
                    type="email"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    You can add multiple emails separated by commas.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Personal message (optional)
                  </label>
                  <Textarea
                    ref={messageRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell them why they'd love Planet Baltimore..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSendInvite}
                  disabled={sending || !email.trim()}
                  className="w-full gap-2 bg-primary hover:opacity-90"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {sending ? "Sending..." : "Send Invite"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Recent invites */}
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent invites
            </h3>
            {loadingInvites ? (
              <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : invites.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 py-5 text-center">
                <Gift className="mx-auto h-6 w-6 text-muted-foreground/60" />
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  No invites yet
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Start sharing to grow your network.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {invites.slice(0, 5).map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-foreground">
                          {invite.email}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(invite.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}
