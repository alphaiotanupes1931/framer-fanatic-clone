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
import { RichTextEditor, richHtmlToPlainText } from "@/components/rich-text-editor";
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
  Upload,
  Trash2,
  RefreshCw,
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

// Invite links always point at the public domain, never the preview host.
const PUBLIC_SITE_URL = "https://planetbaltimore.com";

const makeToken = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .replace(/-/g, "")
    .slice(0, 24);

const buildInviteUrl = (username?: string | null, token?: string) => {
  const url = new URL("/invite", PUBLIC_SITE_URL);
  if (username) url.searchParams.set("ref", username);
  if (token) url.searchParams.set("iv", token);
  return url.toString();
};

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
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({ total: 0, joined: 0, points: 0 });
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  

  const inviteUrl = useMemo(() => {
    return buildInviteUrl(profile?.username);
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
        .select("id, email, created_at, clicked_at, accepted_at")
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


  const extractEmails = (raw: string) =>
    Array.from(new Set((raw.match(EMAIL_RE) || []).map((e) => e.toLowerCase())));

  const handleParse = () => {
    const found = extractEmails(email);
    if (found.length === 0) {
      toast.error("No valid emails found");
      return;
    }
    setParsedEmails(found);
    toast.success(`Found ${found.length} email${found.length === 1 ? "" : "s"}`);
  };

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }
    const content = await file.text();
    const found = extractEmails(`${email}\n${content}`);
    if (found.length === 0) {
      toast.error("No emails found in that file");
      return;
    }
    setEmail((prev) => (prev ? `${prev}\n${content}` : content));
    setParsedEmails(found);
    toast.success(`Found ${found.length} email${found.length === 1 ? "" : "s"}`);
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

  const deliverInvites = async (emails: string[], opts?: { record?: boolean }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Please sign in first");
    const inviterName =
      profile?.display_name || profile?.username || "A friend";

    let sent = 0;
    const failures: string[] = [];
    const tokens = new Map<string, string>();
    const sentEmails: string[] = [];
    for (const to of emails) {
      const token = makeToken();
      tokens.set(to, token);
      const trackedUrl = buildInviteUrl(profile?.username, token);
      const res = await fetch("/lovable/email/transactional/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          templateName: "referral-invite",
          recipientEmail: to,
          idempotencyKey: `referral-${session.user.id}-${to}-${Date.now()}`,
          templateData: {
            inviterName,
            personalMessage: richHtmlToPlainText(message) || "",
            inviteUrl: trackedUrl,
          },
        }),
      });
      if (res.ok) {
        sent += 1;
        sentEmails.push(to);
      } else {
        const body = await res.json().catch(() => ({}));
        failures.push(`${to}: ${body.error || res.statusText}`);
      }
    }

    if (opts?.record && sent > 0) {
      const rows = sentEmails.map((e) => ({
        email: e,
        invited_by: session.user.id,
        invite_url: buildInviteUrl(profile?.username, tokens.get(e)),
        token: tokens.get(e),
      }));
      const { error } = await supabase.from("invites").insert(rows);
      if (error && !error.message.includes("does not exist")) {
        console.error("invite log failed", error);
      }
    }

    return { sent, failures };
  };

  const handleDeleteInvite = async (invite: any) => {
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    setSelected((prev) => prev.filter((id) => id !== invite.id));
    const { error } = await supabase.from("invites").delete().eq("id", invite.id);
    if (error) {
      toast.error("Could not delete invite");
      loadStats();
      return;
    }
    toast.success("Invite deleted");
    loadStats();
  };

  const handleResendInvite = async (invite: any) => {
    setResending(invite.id);
    try {
      const { sent, failures } = await deliverInvites([invite.email]);
      if (sent > 0) toast.success(`Invite resent to ${invite.email}`);
      else toast.error(failures[0] || "Could not resend invite");
    } catch (err: any) {
      toast.error(err.message || "Could not resend invite");
    } finally {
      setResending(null);
    }
  };

  const visibleInvites = useMemo(() => invites.slice(0, 20), [invites]);
  const allSelected = visibleInvites.length > 0 && selected.length === visibleInvites.length;

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAll = () =>
    setSelected(allSelected ? [] : visibleInvites.map((i: any) => i.id));

  const handleBulkResend = async () => {
    const rows = invites.filter((i: any) => selected.includes(i.id));
    if (rows.length === 0) return;
    setBulkBusy(true);
    try {
      const { sent, failures } = await deliverInvites(rows.map((r: any) => r.email));
      if (sent > 0) toast.success(`Resent ${sent} invite${sent === 1 ? "" : "s"}`);
      if (failures.length > 0) toast.error(`Could not resend: ${failures[0]}`);
      setSelected([]);
    } catch (err: any) {
      toast.error(err.message || "Could not resend invites");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Delete ${selected.length} invite${selected.length === 1 ? "" : "s"}?`)) return;
    const ids = [...selected];
    setBulkBusy(true);
    setInvites((prev) => prev.filter((i: any) => !ids.includes(i.id)));
    setSelected([]);
    const { error } = await supabase.from("invites").delete().in("id", ids);
    if (error) toast.error("Could not delete some invites");
    else toast.success(`Deleted ${ids.length} invite${ids.length === 1 ? "" : "s"}`);
    setBulkBusy(false);
    loadStats();
  };

  const handleSendInvite = async () => {
    const emails = parsedEmails.length > 0 ? parsedEmails : extractEmails(email);
    if (emails.length === 0) {
      toast.error("Please enter at least one valid email");
      return;
    }
    setSending(true);
    try {
      const { sent, failures } = await deliverInvites(emails, { record: true });
      if (sent > 0) {
        toast.success(`Invite email sent to ${sent} ${sent === 1 ? "person" : "people"}`);
        setEmail("");
        setParsedEmails([]);
        loadStats();
      }
      if (failures.length > 0) {
        toast.error(`Could not send: ${failures[0]}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Could not send invite");
    } finally {
      setSending(false);
    }
  };

  const handleSendTest = async () => {
    const match = testEmail.match(EMAIL_RE);
    if (!match) {
      toast.error("Enter a valid email to test");
      return;
    }
    setSendingTest(true);
    try {
      const { sent, failures } = await deliverInvites([match[0].toLowerCase()]);
      if (sent > 0) {
        toast.success(`Test email sent to ${match[0]}. Check the inbox (and spam).`);
      } else {
        toast.error(failures[0] || "Test email failed to send");
      }
    } catch (err: any) {
      toast.error(err.message || "Test email failed to send");
    } finally {
      setSendingTest(false);
    }
  };

  const handleClose = () => {
    setTab("link");
    setEmail("");
    setParsedEmails([]);
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
              <TabsTrigger value="gifts" className="flex-1 gap-1.5 text-xs sm:text-sm">
                <Gift className="h-3.5 w-3.5" /> Gifts
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
                    Email addresses
                  </label>
                  <Textarea
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setParsedEmails([]); }}
                    placeholder="Paste a whole list here: friend@example.com, another@example.com..."
                    rows={4}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Paste any list, commas, spaces, or new lines all work. We pull out the valid emails for you.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border p-4 text-center transition hover:border-primary hover:bg-muted/40"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Upload a CSV or text file</span>
                  <span className="text-[11px] text-muted-foreground">
                    Contacts exported from Gmail, Outlook, or a spreadsheet
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                />

                {parsedEmails.length > 0 ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="mb-1 text-xs font-semibold text-foreground">
                      {parsedEmails.length} recipient{parsedEmails.length === 1 ? "" : "s"} ready
                    </div>
                    <div className="max-h-24 overflow-y-auto text-[11px] text-muted-foreground">
                      {parsedEmails.join(", ")}
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleParse}
                    disabled={!email.trim()}
                    className="w-full gap-2 border-primary text-primary hover:bg-primary/10"
                  >
                    <Mail className="h-4 w-4" /> Parse emails
                  </Button>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Personal message (optional)
                  </label>
                  <RichTextEditor
                    value={message}
                    onChange={setMessage}
                    placeholder="Tell them why they'd love Planet Baltimore..."
                    minHeight={110}
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
                  {sending
                    ? "Sending..."
                    : parsedEmails.length > 1
                      ? `Send ${parsedEmails.length} invites`
                      : "Send Invite"}
                </Button>

                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Send a test email
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="you@example.com"
                      type="email"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendTest}
                      disabled={sendingTest || !testEmail.trim()}
                      className="shrink-0 gap-1.5 border-primary text-primary hover:bg-primary/10"
                    >
                      {sendingTest ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Test
                    </Button>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Sends the real invite email to one address without logging it as an invite.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gifts" className="mt-3 space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  All referral points go toward Baltimore 100
                </div>
                <div className="text-2xl font-bold text-primary">{stats.points}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Every friend who joins adds 5 points.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Recent invites */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent invites
              </h3>
              {invites.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {allSelected ? "Clear selection" : "Select all"}
                </button>
              )}
            </div>
            {selected.length > 0 && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <span className="text-xs font-medium text-foreground">
                  {selected.length} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={bulkBusy} onClick={handleBulkResend}>
                    {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Resend
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs text-destructive hover:text-destructive" disabled={bulkBusy} onClick={handleBulkDelete}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
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
                {visibleInvites.map((invite: any) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 shrink-0 accent-[hsl(var(--primary))]"
                        checked={selected.includes(invite.id)}
                        onChange={() => toggleSelect(invite.id)}
                        aria-label={`Select ${invite.email}`}
                      />
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
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          invite.accepted_at
                            ? "bg-emerald-100 text-emerald-700"
                            : invite.clicked_at
                              ? "bg-amber-100 text-amber-700"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {invite.accepted_at ? "Joined" : invite.clicked_at ? "Opened link" : "Sent"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Resend invite"
                        disabled={resending === invite.id}
                        onClick={() => handleResendInvite(invite)}
                      >
                        {resending === invite.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Delete invite"
                        onClick={() => handleDeleteInvite(invite)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
