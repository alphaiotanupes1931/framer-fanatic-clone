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
  Zap,
  Loader2,
  Crown,
  ChevronRight,
  Send,
  Sparkles,
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
  const [stats, setStats] = useState({ total: 0, active: 0, points: 0 });
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
    const { data, error } = await supabase
      .from("invites")
      .select("id, email, created_at")
      .eq("invited_by", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setInvites(data);
      setStats({ total: data.length, active: 0, points: data.length * 5 });
    }
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-hidden p-0">
        <div className="bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl text-primary-foreground">
              <Sparkles className="h-5 w-5" /> Your Referral Network
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-primary-foreground/90">
            Invite friends to Planet Baltimore and earn points at every level of the chain.
          </p>
        </div>

        <div className="p-6">
          {/* How it works */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              How it works
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {TIERS.map((tier) => (
                <div
                  key={tier.level}
                  className="relative rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    Tier {tier.level}
                  </div>
                  <div className="mb-1 mt-2 text-2xl font-bold text-primary">
                    +{tier.points}
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {tier.label}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {tier.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Total Invited
              </div>
              <div className="mt-1 text-2xl font-bold text-foreground">{stats.total}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Zap className="h-3.5 w-3.5" /> Active
              </div>
              <div className="mt-1 text-2xl font-bold text-foreground">{stats.active}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Crown className="h-3.5 w-3.5" /> Points Earned
              </div>
              <div className="mt-1 text-2xl font-bold text-primary">{stats.points}</div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="link" className="flex-1 gap-1.5">
                <Link2 className="h-4 w-4" /> Share Link
              </TabsTrigger>
              <TabsTrigger value="email" className="flex-1 gap-1.5">
                <Mail className="h-4 w-4" /> Email Invite
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  Your personal referral link
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 overflow-hidden rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                    <span className="block truncate">{inviteUrl || "..."}</span>
                  </div>
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="gap-1.5 border-primary text-primary hover:bg-primary/10"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Share this link anywhere. Anyone who signs up through it counts toward your network.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `Join me on Planet Baltimore! ${inviteUrl}`;
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}&quote=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition"
                >
                  Share on Facebook
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `Join me on Planet Baltimore! ${inviteUrl}`;
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`, "_blank");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition"
                >
                  Share on LinkedIn
                </button>
              </div>
            </TabsContent>

            <TabsContent value="email" className="mt-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">
                    Email address
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="friend@example.com"
                    type="email"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    You can add multiple emails separated by commas.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">
                    Personal message (optional)
                  </label>
                  <Textarea
                    ref={messageRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell them why you think they'd love Planet Baltimore..."
                    rows={4}
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
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent invites
            </h3>
            {loadingInvites ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : invites.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 py-8 text-center">
                <Gift className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  No invites yet
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Start sharing and watch your network grow.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {invites.slice(0, 5).map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {invite.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Invited {new Date(invite.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
