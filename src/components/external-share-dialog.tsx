import { X, Twitter, Facebook, Linkedin, MessageCircle, Mail, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export function ExternalShareDialog({
  open,
  onClose,
  url,
  title,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}) {
  if (!open) return null;
  const text = title || "Check this out on Planet Baltimore";
  const enc = encodeURIComponent;
  const apps = [
    { name: "X / Twitter", icon: Twitter, href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`, color: "#000" },
    { name: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, color: "#1877F2" },
    { name: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, color: "#0A66C2" },
    { name: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${enc(text + " " + url)}`, color: "#25D366" },
    { name: "Messages", icon: MessageCircle, href: `sms:?&body=${enc(text + " " + url)}`, color: "#34C759" },
    { name: "Email", icon: Mail, href: `mailto:?subject=${enc(text)}&body=${enc(url)}`, color: "#6b7280" },
  ];

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { /* noop */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-background p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-base font-semibold">Share to</div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {apps.map((a) => (
            <a
              key={a.name}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-xl border border-border p-3 hover:bg-secondary"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ backgroundColor: a.color }}>
                <a.icon className="h-5 w-5" />
              </div>
              <div className="text-xs font-medium text-center">{a.name}</div>
            </a>
          ))}
        </div>
        <button
          onClick={copy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border py-2.5 text-sm font-medium hover:bg-secondary"
        >
          <LinkIcon className="h-4 w-4" /> Copy link
        </button>
      </div>
    </div>
  );
}