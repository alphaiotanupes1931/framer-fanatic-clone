import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Upload, Loader2, Check, Copy, Share2, Link2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { externalShare } from "@/lib/share-preview";

interface InviteFriendsDialogProps {
  open: boolean;
  onClose: () => void;
  inviteUrl?: string;
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

export function InviteFriendsDialog({ open, onClose, inviteUrl }: InviteFriendsDialogProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sent, setSent] = useState(false);
  const [shareUrl, setShareUrl] = useState(inviteUrl || buildInviteUrl());
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (inviteUrl) {
      setShareUrl(inviteUrl);
      return;
    }
    (async () => {
      const { data: rows } = await supabase.rpc("my_profile");
      const profile = (rows as unknown as Array<Record<string, any>> | null)?.[0];
      setShareUrl(buildInviteUrl(profile?.username));
    })();
  }, [open, inviteUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }
    const content = await file.text();
    setText((prev) => (prev ? prev + "\n" + content : content));
    toast.success("File loaded, click Parse Emails");
  };

  const parseEmails = () => {
    const matches = Array.from(new Set((text.match(EMAIL_RE) || []).map((e) => e.toLowerCase())));
    if (matches.length === 0) {
      toast.error("No valid emails found");
      return;
    }
    setParsed(matches);
    toast.success(`Found ${matches.length} email${matches.length === 1 ? "" : "s"}`);
  };

  const sendInvites = async (emails: string[], opts?: { record?: boolean }) => {
    if (emails.length === 0) return { sent: 0, failures: ["No emails to send"] };
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in first");

      const { data: rows } = await supabase.rpc("my_profile");
      const profile = (rows as unknown as Array<Record<string, any>> | null)?.[0];
      const inviterName = profile?.display_name || profile?.username || "A friend";

      let sentCount = 0;
      const failures: string[] = [];
      const logRows: Array<Record<string, unknown>> = [];
      const tokens = new Map<string, string>();
      const sentEmails: string[] = [];

      for (const to of emails) {
        const token = makeToken();
        tokens.set(to, token);
        const trackedUrl = inviteUrl || buildInviteUrl(profile?.username, token);
        const res = await fetch("/lovable/email/transactional/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            templateName: "referral-invite",
            recipientEmail: to,
            idempotencyKey: `invite-${session.user.id}-${to}-${Date.now()}`,
            templateData: { inviterName, personalMessage: message?.trim() || "", inviteUrl: trackedUrl },
          }),
        });
        if (res.ok) {
          sentCount += 1;
          sentEmails.push(to);
          logRows.push({ email: to, invited_by: session.user.id, invite_url: trackedUrl, token });
        } else {
          const body = await res.json().catch(() => ({}));
          failures.push(`${to}: ${body.error || res.statusText}`);
        }
      }

      if (opts?.record && logRows.length > 0) {
        const { error } = await supabase.from("invites").insert(logRows as any);
        if (error && !error.message.includes("does not exist")) console.error("invite log failed", error);
      }

      return { sent: sentCount, failures };
    } catch (err: any) {
      return { sent: 0, failures: [err.message || "Could not send invites"] };
    } finally {
      setSending(false);
    }
  };

  const handleSendInvite = async () => {
    const emails = parsed.length > 0 ? parsed : Array.from(new Set((text.match(EMAIL_RE) || []).map((e) => e.toLowerCase())));
    if (emails.length === 0) {
      toast.error("Please enter at least one valid email");
      return;
    }
    setParsed(emails);
    const { sent, failures } = await sendInvites(emails, { record: true });
    if (sent > 0) {
      setSent(true);
      toast.success(`Invite${sent === 1 ? "" : "s"} sent to ${sent} ${sent === 1 ? "person" : "people"}${failures.length ? `, ${failures.length} failed` : ""}`);
      setTimeout(() => handleClose(), 1200);
    } else {
      toast.error(failures[0] || "Could not send invites");
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
      const { sent, failures } = await sendInvites([match[0].toLowerCase()]);
      if (sent > 0) {
        toast.success(`Test email sent to ${match[0]}. Check the inbox (and spam).`);
      } else {
        toast.error(failures[0] || "Test email failed to send");
      }
    } finally {
      setSendingTest(false);
    }
  };

  const handleClose = () => {
    setText("");
    setParsed([]);
    setMessage("");
    setTestEmail("");
    setSent(false);
    setSending(false);
    setSendingTest(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[min(95vw,900px)] max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Invite Friends
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Invite link box */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Link2 className="h-3.5 w-3.5" /> Your invite link
            </label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <span className="block truncate">{shareUrl}</span>
              </div>
              <Button onClick={copyLink} variant="outline" size="sm" className="shrink-0 gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => void externalShare(shareUrl, "Join me on Planet Baltimore")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-muted"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
              <a
                href={`sms:?&body=${encodeURIComponent(`Join me on Planet Baltimore! ${shareUrl}`)}`}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-muted"
              >
                Text
              </a>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                    "_blank",
                  )
                }
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-muted"
              >
                Facebook
              </button>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                    "_blank",
                  )
                }
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-muted"
              >
                LinkedIn
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Anyone who joins through this link counts toward your network.
            </p>
          </div>

          {/* Send invite by email - under the link box */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> Send invite by email <span className="h-px flex-1 bg-border" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Email addresses</label>
              <Textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setParsed([]); }}
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
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-5 text-center transition hover:border-primary hover:bg-muted/40"
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
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {parsed.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-1 text-sm font-medium">
                  {parsed.length} recipient{parsed.length === 1 ? "" : "s"} ready
                </div>
                <div className="max-h-24 overflow-y-auto text-xs text-muted-foreground">
                  {parsed.join(", ")}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Personal message (optional)</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell them why they'd love Planet Baltimore..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleSendInvite}
              disabled={sending || sent || (!text.trim() && parsed.length === 0)}
              className="w-full gap-2"
            >
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              ) : sent ? (
                <><Check className="h-4 w-4" /> Sent</>
              ) : (
                <><Send className="h-4 w-4" /> Send Invite</>
              )}
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
                  className="shrink-0 gap-1.5"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}