import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Camera, Upload, ArrowLeft } from "lucide-react";
import pbLogo from "@/assets/pb-logo.png";
import { Img } from "@/components/shared/smart-img";
import { STORED_URL_TTL, compressAvatar } from "@/lib/image-compress";
import { setMyProfileKind } from "@/lib/profile-kind";

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>): { preview?: boolean } =>
    search['preview'] === "1" || search['preview'] === true ? { preview: true } : {},
  component: Onboarding,
  head: () => ({ meta: [{ title: "Welcome - set up your profile" }] }),
});

type JoinKind = "resident" | "artist" | "arts_org" | "business";

const JOIN_OPTIONS: Array<{ value: JoinKind; label: string; blurb: string; nameLabel: string }> = [
  { value: "resident", label: "Resident", blurb: "You live in Baltimore and want to connect with your neighbors.", nameLabel: "Your name" },
  { value: "artist", label: "Artist", blurb: "You make music, art, film, writing or performance.", nameLabel: "Artist name" },
  { value: "arts_org", label: "Arts Organization", blurb: "A gallery, venue, collective or nonprofit.", nameLabel: "Organization name" },
  { value: "business", label: "Business", blurb: "A shop, restaurant, cafe, bar or service.", nameLabel: "Business name" },
];

const ARTIST_CATEGORIES = ["Music", "DJ", "Podcast", "Visual Art", "Photography", "Video", "Literary", "Fashion", "Mixed Media", "Performance", "Other"];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "page";
}

function Onboarding() {
  const navigate = useNavigate();
  const { preview: previewMode } = Route.useSearch();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [isVisitor, setIsVisitor] = useState(false);
  const [homeCity, setHomeCity] = useState<string>("");
  const [kind, setKind] = useState<JoinKind | "">("");
  const [pageName, setPageName] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = JOIN_OPTIONS.find((o) => o.value === kind);

  useEffect(() => {
    if (previewMode) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
      } else {
        const uid = data.session.user.id;
        setUserId(uid);
        let visitor = false;
        try {
          const pending = localStorage.getItem("pb_pending_signup");
          if (pending) {
            const parsed = JSON.parse(pending) as { role?: string; category?: string | null };
            if (parsed.role === "visitor" || parsed.category === "Visitor") visitor = true;
          }
        } catch { /* ignore */ }
        void supabase
          .from("profiles")
          .select("category, display_name")
          .eq("id", uid)
          .maybeSingle()
          .then(({ data: p }) => {
            setIsVisitor(visitor || (p?.category ?? "") === "Visitor");
            if (p?.display_name) setPageName((n) => n || (p.display_name as string));
          });
        if (visitor) setIsVisitor(true);
      }
    });
  }, [navigate, previewMode]);

  useEffect(() => {
    supabase
      .from("neighborhoods")
      .select("name")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) setNeighborhoods(data.map((n: { name: string }) => n.name));
      });
  }, []);

  const onPick = (f: File) => {
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (f.size > 5 * 1024 * 1024) return toast.error("Max image size is 5MB.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const step1Ready = (previewMode || !!file) && (isVisitor ? homeCity.trim().length > 1 : !!neighborhood);
  const step3Ready = pageName.trim().length > 1 && (kind !== "artist" || !!category);

  const goStep2 = () => {
    if (!step1Ready) {
      toast.error(!file && !previewMode ? "Add a profile photo to continue." : isVisitor ? "Tell us where you are visiting from." : "Choose your neighborhood.");
      return;
    }
    setStep(2);
  };

  const finish = async () => {
    if (!kind) { toast.error("Choose how you want to join."); return; }
    if (!step3Ready) { toast.error("Fill in the required fields to continue."); return; }
    if (previewMode) {
      toast.success("Preview only, nothing was saved.");
      navigate({ to: "/admin" });
      return;
    }
    if (!userId || !file) return;
    setBusy(true);
    try {
      const compressed = await compressAvatar(file);
      const ext = compressed.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: compressed.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, STORED_URL_TTL);
      const avatar_url = signed?.signedUrl ?? null;

      const { error } = await supabase
        .from("profiles")
        .update(
          isVisitor
            ? { avatar_url, city: homeCity.trim(), category: "Visitor", onboarded: true }
            : { avatar_url, neighborhood, onboarded: true },
        )
        .eq("id", userId);
      if (error) throw error;

      // Resident and artist pages are personal profiles, so they take over the
      // account's profile type. Arts orgs and businesses stay as extra pages.
      if (kind === "resident" || kind === "artist") {
        await setMyProfileKind(kind);
      }

      const slug = `${slugify(pageName)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: org, error: orgErr } = await supabase.from("organizations").insert({
        owner_id: userId,
        type: kind,
        subtype: selected?.label ?? null,
        name: pageName.trim(),
        slug,
        category: kind === "artist" ? category : null,
        neighborhood: isVisitor ? homeCity.trim() || null : neighborhood || null,
        bio: bio.trim() || null,
        avatar_url,
      }).select("slug").single();
      if (orgErr) throw orgErr;

      let dest: string | null = null;
      try {
        const v = sessionStorage.getItem("pb_post_auth_redirect");
        if (v && v.startsWith("/") && !v.startsWith("//")) dest = v;
        sessionStorage.removeItem("pb_post_auth_redirect");
      } catch { /* ignore */ }
      if (dest) { window.location.replace(dest); return; }
      await navigate({ to: "/o/$slug", params: { slug: org.slug } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <Toaster richColors />
      {previewMode && (
        <div className="fixed inset-x-0 top-0 z-50 bg-neutral-900 px-4 py-2 text-center text-xs font-semibold text-white">
          Admin preview, nothing you enter here is saved.
        </div>
      )}
      <Card className="w-full max-w-md border-orange-200">
        <CardHeader className="text-center">
          <Img src={pbLogo} alt="Logo" className="mx-auto mb-4 h-12 w-auto" />
          <CardTitle className="text-2xl">
            {step === 1 ? "Add a profile photo" : step === 2 ? "Choose how you want to join" : `Set up your ${selected?.label ?? "page"} page`}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "All fields below are required so your neighbors can recognize you."
              : step === 2
              ? "Pick the page that best describes you. You can add more pages later."
              : selected?.blurb}
          </CardDescription>
          <div className="mt-3 flex justify-center gap-1.5">
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-1.5 w-8 rounded-full ${n <= step ? "bg-orange-600" : "bg-neutral-200"}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="flex flex-col items-center gap-4">
                <p className="text-xs font-medium text-orange-600">Profile photo (required)</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group relative h-32 w-32 overflow-hidden rounded-full border-4 border-dashed border-orange-300 bg-orange-50 transition hover:border-orange-500"
                >
                  {preview ? (
                    <Img src={preview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-orange-500">
                      <Camera className="mb-1 h-7 w-7" />
                      <span className="text-xs">Tap to upload</span>
                    </div>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" /> {file ? "Change photo" : "Choose photo"}
                </Button>
              </div>
              {isVisitor ? (
                <div className="space-y-2">
                  <Label htmlFor="homeCity">Where are you visiting from? <span className="text-orange-600">*</span></Label>
                  <Input
                    id="homeCity"
                    value={homeCity}
                    onChange={(e) => setHomeCity(e.target.value)}
                    placeholder="City, county, state (e.g. Silver Spring, Montgomery County, MD)"
                    maxLength={120}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Your Baltimore neighborhood <span className="text-orange-600">*</span></Label>
                  <Select value={neighborhood} onValueChange={setNeighborhood}>
                    <SelectTrigger id="neighborhood">
                      <SelectValue placeholder="Select your neighborhood" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {neighborhoods.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={goStep2} disabled={!step1Ready} className="w-full bg-orange-600 text-white hover:bg-orange-700">
                Continue
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="joinKind">How do you want to join? <span className="text-orange-600">*</span></Label>
                <Select value={kind} onValueChange={(v) => setKind(v as JoinKind)}>
                  <SelectTrigger id="joinKind">
                    <SelectValue placeholder="Select a page type" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOIN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selected && <p className="text-xs text-neutral-500">{selected.blurb}</p>}
              </div>
              <p className="rounded-lg bg-neutral-100 p-3 text-xs text-neutral-600">
                Resident and Artist pages become your main profile. Arts Organization and Business pages
                live alongside it, and creating a Resident or Artist page later will take over as your profile.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!kind} className="flex-1 bg-orange-600 text-white hover:bg-orange-700">
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pageName">{selected?.nameLabel ?? "Name"} <span className="text-orange-600">*</span></Label>
                <Input id="pageName" value={pageName} onChange={(e) => setPageName(e.target.value)} maxLength={80} />
              </div>
              {kind === "artist" && (
                <div className="space-y-2">
                  <Label htmlFor="artistCategory">Discipline <span className="text-orange-600">*</span></Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="artistCategory">
                      <SelectValue placeholder="Select your discipline" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {ARTIST_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="onboardBio">Short bio</Label>
                <Textarea id="onboardBio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={1000} placeholder="Tell the city a little about you." />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => finish()} disabled={busy || !step3Ready} className="flex-1 bg-orange-600 text-white hover:bg-orange-700">
                  {busy ? "Saving…" : `Create my ${selected?.label ?? "page"}`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
