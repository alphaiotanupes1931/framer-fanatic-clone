import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, MapPin, Pencil, Share2, UserPlus, MessageCircle, BookOpen, CreditCard, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";
import { useServerFn } from "@tanstack/react-start";
import {
  ensureConnectAccount,
  createConnectOnboardingLink,
  refreshConnectStatus,
  becomeArtist,
} from "@/lib/stripe.functions";
import { tabsForCategory } from "@/lib/categories";
import { ProfileSectionTab } from "@/components/profile-sections";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile - Planet Baltimore" }] }),
});

const TABS_ARTIST_BASE = ["Posts","Videos","Events","About","Saved","Organized","My Tickets","Stripe"] as const;
const TABS_ATTENDEE_BASE = ["Videos","About","Saved","Attending","My Tickets"] as const;
type Tab = string;

function ProfilePage() {
  const profile = useCurrentProfile();
  const { isArtist, isAttendee, loading: roleLoading } = useUserRole();
  const categoryTabs = tabsForCategory((profile as { category?: string | null } | null)?.category);
  const baseTabs = isArtist ? TABS_ARTIST_BASE : TABS_ATTENDEE_BASE;
  const TABS: readonly string[] = [...baseTabs, ...categoryTabs.map((t) => t.label)];
  const [tab, setTab] = useState<Tab>("Posts");
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });

  useEffect(() => {
    if (!TABS.includes(tab)) setTab(TABS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArtist]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ count: posts }, { count: followers }, { count: following }] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id),
      ]);
      setStats({ posts: posts || 0, followers: followers || 0, following: following || 0 });
    })();
  }, [profile]);

  const uploadBanner = async (file: File) => {
    if (!profile) return;
    const path = `${profile.id}/banner-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data, error: signErr } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (signErr || !data) { toast.error(signErr?.message || "Could not sign URL"); return; }
    await supabase.from("profiles").update({ banner_url: data.signedUrl }).eq("id", profile.id);
    toast.success("Banner updated"); location.reload();
  };

  const initials = (profile?.display_name || profile?.email || "U").slice(0, 2).toUpperCase();
  const roleLabel = isArtist ? "Artist" : isAttendee ? "Attendee" : ((profile?.role || "attendee").replace(/\b\w/g, (c) => c.toUpperCase()));

  return (
    <AppLayout title="" hero={false}>
      <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden">
        <div
          className="relative h-56 bg-gradient-to-br from-neutral-200 to-neutral-300"
          style={profile?.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          <label className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white hover:bg-black/80">
            <Camera className="h-3.5 w-3.5" /> {profile?.banner_url ? "Change banner" : "Add banner"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadBanner(e.target.files[0])} />
          </label>
        </div>

        <div className="relative px-6 pb-6">
          <div className="-mt-12 flex items-end justify-between gap-4">
            <Avatar className="h-24 w-24 ring-4 ring-white">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-orange-100 text-2xl text-orange-700">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <Link to="/stories" aria-label="My stories" className="rounded-full bg-orange-100 p-2.5 text-orange-700 hover:bg-orange-200"><BookOpen className="h-4 w-4" /></Link>
              <Link to="/events" aria-label="Create event" className="rounded-full bg-orange-100 p-2.5 text-orange-700 hover:bg-orange-200">+</Link>
              <Link to="/settings" className="rounded-full bg-neutral-100 p-2.5 hover:bg-neutral-200"><Pencil className="h-4 w-4" /></Link>
              <Link to="/messages" aria-label="Messages" className="rounded-full bg-neutral-100 p-2.5 hover:bg-neutral-200"><MessageCircle className="h-4 w-4" /></Link>
              <Link to="/artists" aria-label="Find people to follow" className="rounded-full bg-neutral-100 p-2.5 hover:bg-neutral-200"><UserPlus className="h-4 w-4" /></Link>
              <button
                aria-label="Share profile"
                onClick={async () => {
                  const url = `${window.location.origin}/profile`;
                  try {
                    if (navigator.share) await navigator.share({ title: "Planet Baltimore", url });
                    else { await navigator.clipboard.writeText(url); toast.success("Profile link copied"); }
                  } catch { /* user cancelled */ }
                }}
                className="rounded-full bg-neutral-100 p-2.5 hover:bg-neutral-200"
              ><Share2 className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 text-xl font-bold">{profile?.username || profile?.display_name}</div>
            <Link to="/settings" className="mt-1 flex items-center gap-1 text-sm text-neutral-500 hover:text-orange-600">
              <MapPin className="h-3.5 w-3.5" /> {profile?.neighborhood || "Add neighborhood"}
            </Link>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium capitalize">
              {roleLabel}
            </span>
          </div>

          <div className="mt-5 flex gap-8 text-sm">
            <div><div className="text-lg font-bold">{stats.posts}</div><div className="text-neutral-500">Posts</div></div>
            <div><div className="text-lg font-bold">{stats.followers}</div><div className="text-neutral-500">Followers</div></div>
            <div><div className="text-lg font-bold">{stats.following}</div><div className="text-neutral-500">Following</div></div>
            <div><div className="text-lg font-bold">0</div><div className="text-neutral-500">Referrals</div></div>
          </div>

          <div className="mt-6 flex gap-1 overflow-x-auto border-b border-neutral-200">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition ${tab===t ? "border-orange-600 text-orange-600" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="py-8">
            {tab === "Stripe" && isArtist ? (
              <StripeTab />
            ) : tab === "My Tickets" ? (
              <MyTicketsTab />
            ) : categoryTabs.find((t) => t.label === tab) ? (
              profile ? (
                <ProfileSectionTab
                  userId={profile.id}
                  kind={categoryTabs.find((t) => t.label === tab)!.kind}
                  label={tab}
                  canEdit={true}
                />
              ) : null
            ) : (
              <div className="py-12 text-center text-neutral-500">
                {!roleLoading && isAttendee ? (
                  <BecomeArtistCTA />
                ) : (
                  <>No {tab.toLowerCase()} yet. Share something with the community!</>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function BecomeArtistCTA() {
  const become = useServerFn(becomeArtist);
  const [loading, setLoading] = useState(false);
  return (
    <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-left">
      <h3 className="text-base font-semibold text-neutral-900">Want to host events or post?</h3>
      <p className="text-sm text-neutral-600">
        Attendees can view content and buy tickets. To create events, post, or sell tickets, upgrade to an
        Artist account. Artist accounts are limited to verified Baltimore-area residents.
      </p>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            const coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
              if (!("geolocation" in navigator)) return resolve(null);
              navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
              );
            });
            if (!coords) {
              toast.error("We need your location to verify you're in Baltimore. Please enable location access and try again.");
              return;
            }
            await become({ data: { lat: coords.lat, lng: coords.lng } });
            toast.success("You're now an Artist, reloading...");
            setTimeout(() => location.reload(), 700);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to upgrade");
          } finally {
            setLoading(false);
          }
        }}
        className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Upgrading…" : "Become an Artist"}
      </button>
    </div>
  );
}

function MyTicketsTab() {
  const [tickets, setTickets] = useState<Array<{
    id: string; status: string; buyer_total_cents: number; event_id: string;
    events: { title: string; starts_at: string; location: string | null } | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) { setLoading(false); return; }
      const { data } = await supabase
        .from("tickets")
        .select("id, status, buyer_total_cents, event_id, events(title, starts_at, location)")
        .eq("buyer_id", uid)
        .order("created_at", { ascending: false });
      setTickets((data ?? []) as never);
      setLoading(false);
    })();
  }, []);
  if (loading) return <div className="py-12 text-center text-neutral-500">Loading tickets…</div>;
  if (tickets.length === 0) return <div className="py-12 text-center text-neutral-500">No tickets yet.</div>;
  return (
    <div className="space-y-3">
      {tickets.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-4">
          <div>
            <div className="font-semibold">{t.events?.title ?? "Event"}</div>
            <div className="text-xs text-neutral-500">
              {t.events?.starts_at ? new Date(t.events.starts_at).toLocaleString() : ""}
              {t.events?.location ? ` · ${t.events.location}` : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold">${(t.buyer_total_cents/100).toFixed(2)}</div>
            <div className={`text-[11px] uppercase tracking-wider ${t.status === "paid" ? "text-emerald-600" : "text-neutral-400"}`}>{t.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StripeTab() {
  const profile = useCurrentProfile();
  const ensureFn = useServerFn(ensureConnectAccount);
  const linkFn = useServerFn(createConnectOnboardingLink);
  const refreshFn = useServerFn(refreshConnectStatus);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; chargesEnabled: boolean; status?: string } | null>(null);

  useEffect(() => {
    if (!profile?.stripe_account_id) { setStatus({ connected: false, chargesEnabled: false }); return; }
    refreshFn().then((s) => setStatus(s)).catch(() => setStatus({
      connected: !!profile?.stripe_account_id,
      chargesEnabled: !!(profile as unknown as { stripe_charges_enabled?: boolean })?.stripe_charges_enabled,
    }));
  }, [profile?.id, profile?.stripe_account_id, refreshFn]);

  const onboard = async () => {
    setBusy(true);
    try {
      await ensureFn();
      const { url } = await linkFn({ data: {
        returnUrl: `${window.location.origin}/profile?tab=Stripe&onboarded=1`,
        refreshUrl: `${window.location.origin}/profile?tab=Stripe&refresh=1`,
      }});
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start onboarding");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-neutral-200 p-6">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 text-orange-600" />
          <div>
            <h3 className="text-base font-semibold">Payouts via Stripe</h3>
            <p className="mt-1 text-sm text-neutral-600">
              Connect your Stripe account to sell tickets on Planet Baltimore. We use Stripe Connect so payouts
              go directly to your bank - Planet Baltimore never holds your money.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          {status?.chargesEnabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected & active
            </span>
          ) : status?.connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" /> Onboarding incomplete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              Not connected
            </span>
          )}
          <button
            onClick={onboard}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Opening Stripe…" : status?.chargesEnabled ? "Update Stripe account" : "Connect Stripe"} <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-6 text-sm leading-relaxed text-neutral-700">
        <h4 className="mb-3 text-base font-semibold text-neutral-900">How payments work</h4>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>Click "Connect Stripe"</strong> above. You'll be redirected to Stripe to enter your
            personal info, bank account, and tax details. This is required by US payment regulations.
          </li>
          <li>
            <strong>Set ticket prices on your events.</strong> Enter the amount <em>you</em> want to receive
            per ticket. We automatically add Stripe's processing fee (2.9% + $0.30) and Baltimore City's
            10% Admissions &amp; Amusement Tax on top - so the buyer pays the all-in total and you net your
            advertised price.
          </li>
          <li>
            <strong>Buyers pay through Stripe Checkout.</strong> Stripe deducts its fee, sends the Baltimore
            tax portion to Planet Baltimore (we file and remit it to the city), and pays the rest directly to
            your connected bank account.
          </li>
          <li>
            <strong>Payouts</strong> arrive on Stripe's standard schedule (typically 2 business days for new
            accounts). You can view all transactions inside your Stripe dashboard.
          </li>
        </ol>

        <h4 className="mt-6 mb-2 text-sm font-semibold text-neutral-900">Example: $20 ticket</h4>
        <ul className="space-y-1 text-sm">
          <li>You set price: <strong>$20.00</strong> (what you keep)</li>
          <li>Baltimore A&amp;A tax (10%): <strong>$2.00</strong> (routed to Planet Baltimore)</li>
          <li>Stripe fee (~2.9% + $0.30): <strong>~$0.98</strong></li>
          <li>Buyer pays: <strong>~$22.98</strong></li>
        </ul>
      </div>
    </div>
  );
}