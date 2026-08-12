import { useState } from "react";
import { Mail, Phone, Globe, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const INTENTS = ["Commission", "Booking", "Press", "Collaboration", "General"];

/**
 * Contact card plus a working inquiry form. Messages land in artist_inquiries
 * so the page owner can follow up by email.
 */
export function ContactTab({
  ownerId,
  name,
  email,
  phone,
  website,
  address,
}: {
  ownerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
}) {
  const [form, setForm] = useState({ intent: INTENTS[0], sender_name: "", sender_email: "", message: "" });
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!form.sender_name.trim() || !form.sender_email.trim() || !form.message.trim()) {
      toast.error("Name, email and message are required");
      return;
    }
    setSending(true);
    const { data: sess } = await supabase.auth.getSession();
    const { error } = await supabase.from("artist_inquiries").insert({
      artist_id: ownerId,
      sender_id: sess.session?.user.id ?? null,
      intent: form.intent,
      sender_name: form.sender_name.trim(),
      sender_email: form.sender_email.trim(),
      message: form.message.trim(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setForm({ intent: INTENTS[0], sender_name: "", sender_email: "", message: "" });
    toast.success("Message sent");
  };

  const rows = [
    email ? { Icon: Mail, label: email, href: `mailto:${email}` } : null,
    phone ? { Icon: Phone, label: phone, href: `tel:${phone}` } : null,
    website ? { Icon: Globe, label: website, href: website } : null,
    address ? { Icon: MapPin, label: address, href: null } : null,
  ].filter(Boolean) as { Icon: typeof Mail; label: string; href: string | null }[];

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <aside className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground">Reach {name}</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public contact details yet. Use the form to get in touch.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center gap-2 text-sm text-foreground">
                <r.Icon className="h-4 w-4 shrink-0 text-[#d4580a]" />
                {r.href ? (
                  <a href={r.href} target={r.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="truncate hover:underline">{r.label}</a>
                ) : (
                  <span className="truncate">{r.label}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground">Send an inquiry</h3>
        <div className="flex flex-wrap gap-2">
          {INTENTS.map((i) => (
            <button
              key={i}
              onClick={() => setForm({ ...form, intent: i })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                form.intent === i ? "border-[#d4580a] bg-[#d4580a] text-white" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} placeholder="Your name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.sender_email} onChange={(e) => setForm({ ...form, sender_email: e.target.value })} placeholder="Your email" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} placeholder="What would you like to talk about?" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button onClick={() => void submit()} disabled={sending} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send message"}
        </button>
      </div>
    </div>
  );
}
