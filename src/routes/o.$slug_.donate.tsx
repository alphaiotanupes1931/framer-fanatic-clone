import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { createOrgDonationCheckout } from "@/lib/stripe.functions";
import { Heart, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Img } from "@/components/shared/smart-img";

export const Route = createFileRoute("/o/$slug_/donate")({
  component: DonatePage,
  head: () => ({
    meta: [
      { title: "Donate | Planet Baltimore" },
      { name: "description", content: "Support this organization with a direct donation." },
    ],
  }),
});

const PRESETS = [10, 25, 50, 100, 250];

function DonatePage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<{ id: string; name: string; avatar_url: string | null; slug: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [interval, setInterval] = useState<"once" | "monthly" | "yearly">("once");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("interval");
    if (q === "yearly" || q === "monthly") setInterval(q);
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const donate = useServerFn(createOrgDonationCheckout);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: o } = await supabase
        .from("organizations")
        .select("id, name, avatar_url, slug, owner_id")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!o) {
        setLoading(false);
        return;
      }
      setOrg({ id: o.id, name: o.name, avatar_url: o.avatar_url, slug: o.slug });
      const { data: ready } = await (supabase as any).rpc("payouts_ready", { _user_id: o.owner_id });
      if (cancelled) return;
      setReady(!!ready);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const finalCents = (() => {
    const c = custom.trim();
    if (c) {
      const n = Number(c);
      if (!Number.isFinite(n) || n <= 0) return 0;
      return Math.round(n * 100);
    }
    return Math.round(amount * 100);
  })();

  const submit = async () => {
    if (!org) return;
    if (finalCents < 100) {
      toast.error("Minimum donation is $1.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please sign in to donate.");
        navigate({ to: "/auth" });
        return;
      }
      const { url } = await donate({
        data: {
          orgId: org.id,
          amountCents: finalCents,
          returnOrigin: window.location.origin,
          note: note.trim() || undefined,
          interval,
        },
      });
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-xl px-4 py-8">
        <Link to="/o/$slug" params={{ slug }} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-[#d4580a]">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {loading ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">Loading…</div>
        ) : !org ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">Organization not found.</div>
        ) : !ready ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#d4580a]">
              <Heart className="h-6 w-6" />
            </div>
            <div className="text-lg font-bold text-neutral-900">{org.name}</div>
            <p className="mt-3 text-sm text-neutral-600">
              This art organization has not yet set up a payment method. Please check back later, or contact them directly to make a contribution.
            </p>
            <Link to="/o/$slug" params={{ slug }}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]">
              Back to page
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              {org.avatar_url && <Img src={org.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#d4580a]">Donate to</div>
                <div className="text-lg font-bold text-neutral-900">{org.name}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-neutral-700">How often</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([
                  { k: "once", label: "One time" },
                  { k: "monthly", label: "Monthly" },
                  { k: "yearly", label: "Yearly" },
                ] as const).map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setInterval(o.k)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${interval === o.k ? "border-[#d4580a] bg-orange-50 text-[#d4580a]" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-neutral-700">Choose an amount</div>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setAmount(v); setCustom(""); }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${!custom && amount === v ? "border-[#d4580a] bg-orange-50 text-[#d4580a]" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"}`}
                  >
                    ${v}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <label className="text-sm font-semibold text-neutral-700">Custom amount</label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 focus-within:border-[#d4580a]">
                  <span className="text-neutral-500">$</span>
                  <input
                    inputMode="decimal"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="Enter amount"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-semibold text-neutral-700">Add a note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 280))}
                  rows={3}
                  placeholder="Say a few words to the team"
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4580a]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting || finalCents < 100}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d4580a] px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              <Heart className="h-4 w-4" />
              {submitting
                ? "Redirecting to checkout…"
                : `Donate $${(finalCents / 100).toFixed(2)}${interval === "monthly" ? " / month" : interval === "yearly" ? " / year" : ""}`}
            </button>
            <p className="mt-2 text-center text-[11px] text-neutral-500">
              Secure, encrypted checkout. 100% of your contribution goes to {org.name} minus standard processing fees.
              {interval !== "once" && " You can cancel a recurring donation at any time."}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}