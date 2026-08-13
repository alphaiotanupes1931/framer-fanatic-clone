import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Upload, Mail, Loader2, Check, Copy, Share2, Link2, Send } from "lucide-react";
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

  const sendInvites = async () => {
    if (parsed.length === 0) return;
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

      for (const to of parsed) {
        const token = makeToken();
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
            templateData: { inviterName, personalMessage: "", inviteUrl: trackedUrl },
          }),
        });
        if (res.ok) {
          sentCount += 1;
          logRows.push({ email: to, invited_by: session.user.id, invite_url: trackedUrl, token });
        } else {
          const body = await res.json().catch(() => ({}));
          failures.push(`${to}: ${body.error || res.statusText}`);
        }
      }

      if (logRows.length > 0) {
        const { error } = await supabase.from("invites").insert(logRows as any);
        if (error && !error.message.includes("does not exist")) console.error("invite log failed", error);
      }

      if (sentCount === 0) {
        toast.error(failures[0] || "Could not send invites");
        return;
      }
      setSent(true);
      toast.success(
        `Invite${sentCount === 1 ? "" : "s"} sent to ${sentCount} ${sentCount === 1 ? "person" : "people"}` +
          (failures.length ? `, ${failures.length} failed` : ""),
      );
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      toast.error(err.message || "Could not send invites");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setText("");
    setParsed([]);
    setSent(false);
    setSending(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="w-full max-w-xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Invite Friends
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Link2 className="h-3.5 w-3.5" /> Your invite link
            </label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-background px-2 py-2 text-xs text-muted-foreground">
                <span className="block truncate">{shareUrl}</span>
              </div>
              <Button onClick={copyLink} variant="outline" size="sm" className="shrink-0 gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button onClick={() => void externalShare(shareUrl, "Join me on Planet Baltimore")} size="sm" className="shrink-0 gap-1.5">
                <Send className="h-3.5 w-3.5" /> Send Invite
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
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

          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or send by email <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition hover:border-primary hover:bg-muted/50"
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="font-medium">Upload a CSV or text file</div>
            <div className="text-sm text-muted-foreground">
              Any file with emails, exported from Gmail, Outlook, etc.
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Or paste emails directly</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="john@example.com, jane@example.com..."
              rows={5}
            />
          </div>

          {parsed.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="mb-1 font-medium">{parsed.length} recipient{parsed.length === 1 ? "" : "s"} ready</div>
              <div className="max-h-24 overflow-y-auto text-muted-foreground">
                {parsed.join(", ")}
              </div>
            </div>
          )}

          {parsed.length === 0 ? (
            <Button onClick={parseEmails} disabled={!text.trim()} className="w-full">
              <Mail className="mr-2 h-4 w-4" /> Parse Emails
            </Button>
          ) : (
            <Button onClick={sendInvites} disabled={sending || sent} className="w-full">
              {sending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
              ) : sent ? (
                <><Check className="mr-2 h-4 w-4" /> Sent</>
              ) : (
                <><Mail className="mr-2 h-4 w-4" /> Send {parsed.length} invite{parsed.length === 1 ? "" : "s"}</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}