import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Upload, Mail, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface InviteFriendsDialogProps {
  open: boolean;
  onClose: () => void;
  inviteUrl?: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function InviteFriendsDialog({ open, onClose, inviteUrl }: InviteFriendsDialogProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const url = inviteUrl || (typeof window !== "undefined" ? window.location.origin : "");

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
      const { data: { user } } = await supabase.auth.getUser();
      const rows = parsed.map((email) => ({
        email,
        invited_by: user?.id ?? null,
        invite_url: url,
      }));
      const { error } = await supabase.from("invites").insert(rows);
      if (error && !error.message.includes("does not exist")) throw error;
      setSent(true);
      toast.success(`Invited ${parsed.length} friend${parsed.length === 1 ? "" : "s"}`);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Invite Friends
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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