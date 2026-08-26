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
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { setMyProfileKind } from "@/lib/profile-kind";

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>): { preview?: boolean } =>
    search['preview'] === "1" || search['preview'] === true ? { preview: true } : {},
  component: Onboarding,
  head: () => ({ meta: [{ title: "Welcome - set up your profile" }] }),
});

type JoinKind = "resident" | "artist" | "arts_org" | "business";

const JOIN_OPTIONS: Array<{ value: JoinKind; label: string; nameLabel: string; blurb: string }> = [
  { value: "resident", label: "Personal", nameLabel: "Your name", blurb: "Resident, neighbor, community member." },
  { value: "artist", label: "Artist", nameLabel: "Artist name", blurb: "Musician, painter, DJ, photographer, filmmaker." },
  { value: "arts_org", label: "Arts Organization", nameLabel: "Organization name", blurb: "Theater, gallery, collective, festival, venue." },
  { value: "business", label: "Business", nameLabel: "Business name", blurb: "Coffee shop, daycare, studio, store, restaurant." },
];


const ARTIST_CATEGORIES = ["Music", "DJ", "Podcast", "Visual Art", "Photography", "Video", "Literary", "Fashion", "Mixed Media", "Performance", "Other"];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY",
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "page";
}

function validateCity(value: string) {
  const v = value.trim();
  if (!v) return "City is required.";
  if (v.length < 2) return "City must be at least 2 characters.";
  return null;
}

function validateState(value: string) {
  if (!value) return "State is required.";
  return null;
}

const DRAFT_KEY = "pb_onboarding_draft";

type OnboardingDraft = {
  step: 0 | 1 | 2 | 3;
  audience: "resident" | "visitor" | "";
  kind: string;
  pageName: string;
  category: string;
  bio: string;
  neighborhood: string;
  homeCity: string;
  homeState: string;
};

function loadDraft(): Partial<OnboardingDraft> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<OnboardingDraft>) : {};
  } catch {
    return {};
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

function Onboarding() {

  const navigate = useNavigate();
  const { preview: previewMode } = Route.useSearch();
  const draft = useRef<Partial<OnboardingDraft>>(loadDraft()).current;
  // 0 = resident or visitor, 1 = how you want to join, 2 = photo + location, 3 = page setup
  // The photo cannot be restored, so never resume past the photo step.
  // Visitors have no page-type step, so a saved step 1 resumes at the photo step.
  const [step, setStep] = useState<0 | 1 | 2 | 3>(() => {
    if (draft.step == null) return 0;
    const resumed = Math.min(draft.step, 2) as 0 | 1 | 2;
    if (draft.audience === "visitor" && resumed === 1) return 2;
    return resumed;
  });

  const [userId, setUserId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [neighborhood, setNeighborhood] = useState<string>(draft.neighborhood ?? "");
  const [audience, setAudience] = useState<"resident" | "visitor" | "">(draft.audience ?? "");
  const [homeCity, setHomeCity] = useState<string>(draft.homeCity ?? "");
  const [homeState, setHomeState] = useState<string>(draft.homeState ?? "");
  const [cityError, setCityError] = useState<string | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [kind, setKind] = useState<JoinKind | "">((draft.kind as JoinKind) ?? "");
  const [pageName, setPageName] = useState(draft.pageName ?? "");

  const [category, setCategory] = useState(draft.category ?? "");
  const [bio, setBio] = useState(draft.bio ?? "");

  const fileRef = useRef<HTMLInputElement>(null);

  const isVisitor = audience === "visitor";
  const selected = JOIN_OPTIONS.find((o) => o.value === kind);
  const pageLabel = isVisitor ? "Visitor" : selected?.label ?? "page";
  const nameLabel = isVisitor ? "Your name" : selected?.nameLabel ?? "Name";
  const totalSteps = isVisitor ? 3 : 4;
  const stepIndex = isVisitor && step > 1 ? step - 1 : step + 1;



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
            if (visitor || (p?.category ?? "") === "Visitor") setAudience("visitor");
            if (p?.display_name) setPageName((n) => n || (p.display_name as string));
          });
        if (visitor) setAudience("visitor");
      }
    });
  }, [navigate, previewMode]);

  // Visitors never see the page-type step, so bounce them forward if they land on it.
  useEffect(() => {
    if (!isVisitor) return;
    if (kind) setKind("");
    if (step === 1) setStep(2);
  }, [isVisitor, kind, step]);


  useEffect(() => {
    supabase
      .from("neighborhoods")
      .select("name")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) setNeighborhoods(data.map((n: { name: string }) => n.name));
      });
  }, []);

  // Auto-save progress so a refresh or going back keeps everything filled in.
  useEffect(() => {
    if (previewMode) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ step, audience, kind, pageName, category, bio, neighborhood, homeCity, homeState }),
      );
    } catch { /* ignore */ }
  }, [previewMode, step, audience, kind, pageName, category, bio, neighborhood, homeCity, homeState]);



  const onPick = (f: File) => {
    const looksLikeImage = f.type.startsWith("image/") || /\.(jpe?g|png|webp|heics?|heif|avif|bmp|tiff?|gif)$/i.test(f.name);
    if (!looksLikeImage) return toast.error("Please choose an image file.");
    setRawFile(f);
    setCropOpen(true);
  };

  const onCropped = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const homeLocation = homeCity.trim() && homeState ? `${homeCity.trim()}, ${homeState}` : "";
  const homeCityValid = !isVisitor || validateCity(homeCity) === null;
  const homeStateValid = !isVisitor || validateState(homeState) === null;
  const locationReady = (isVisitor ? homeCityValid && homeStateValid : !!neighborhood) && !!file;

  const step3Ready = pageName.trim().length > 1 && (isVisitor || kind !== "artist" || !!category);

  const startAudience = (choice: "resident" | "visitor") => {
    setAudience(choice);
    if (choice === "visitor") {
      setKind("");
      setStep(2);
    } else {
      setStep(1);
    }
  };

  // Personal, Arts Organization and Business pages have no artist category.
  const chooseKind = (value: JoinKind) => {
    setKind(value);
    if (value !== "artist") setCategory("");
  };

  const continueFromKind = () => {
    if (!kind) {
      toast.error("Choose how you want to join.");
      return;
    }
    setStep(2);
  };


  const goStep3 = () => {
    if (!file) {
      toast.error("Add a profile photo to continue.");
      return;
    }
    if (isVisitor) {
      const cErr = validateCity(homeCity);
      const sErr = validateState(homeState);
      setCityError(cErr);
      setStateError(sErr);
      if (cErr || sErr) return;
    } else if (!neighborhood) {
      toast.error("Choose your neighborhood.");
      return;
    }
    setStep(3);
  };

  const backFromLocation = () => setStep(isVisitor ? 0 : 1);

  const finish = async () => {
    if (!isVisitor && !kind) { toast.error("Choose how you want to join."); return; }
    if (!step3Ready) { toast.error("Fill in the required fields to continue."); return; }
    if (previewMode) {
      toast.success("Preview only, nothing was saved.");
      navigate({ to: "/admin" });
      return;
    }
    if (!userId) return;
    setBusy(true);
    try {
      let avatar_url: string | null = null;
      if (file) {
        const compressed = await compressAvatar(file);
        const ext = compressed.name.split(".").pop() || "jpg";
        const path = `${userId}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, compressed, { upsert: true, contentType: compressed.type });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, STORED_URL_TTL);
        avatar_url = signed?.signedUrl ?? null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(
          isVisitor
            ? { ...(avatar_url ? { avatar_url } : {}), city: homeLocation, category: "Visitor", onboarded: true }
            : { ...(avatar_url ? { avatar_url } : {}), neighborhood, onboarded: true },
        )
        .eq("id", userId);
      if (error) throw error;

      // Resident and visitor are the account's one canonical personal profile.
      // Artist, arts organization and business choices create separate owned pages.
      if (isVisitor) {
        await setMyProfileKind("visitor");
      } else if (kind === "resident") {
        await setMyProfileKind("resident");
      }

      if (isVisitor || kind === "resident") {
        clearDraft();
        let dest: string | null = null;
        try {
          const v = sessionStorage.getItem("pb_post_auth_redirect");
          if (v && v.startsWith("/") && !v.startsWith("//")) dest = v;
          sessionStorage.removeItem("pb_post_auth_redirect");
        } catch { /* ignore */ }
        if (dest) { window.location.replace(dest); return; }
        await navigate({ to: "/profile" });
        return;
      }

      const slug = `${slugify(pageName)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: org, error: orgErr } = await supabase.from("organizations").insert({
        owner_id: userId,
        type: kind,
        subtype: kind === "artist" ? category : (selected?.label ?? null),
        name: pageName.trim(),
        slug,
        neighborhood: neighborhood || null,
        bio: bio.trim() || null,
        avatar_url,
      }).select("slug").single();
      if (orgErr) throw orgErr;
      clearDraft();


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

  const title =
    step === 0
      ? "Do you live in Baltimore?"
      : step === 1
      ? "Choose how you want to join"
      : step === 2
      ? "Your photo and location"
      : `Set up your ${pageLabel} page`;

  const description =
    step === 0
      ? "This tells us whether to set you up as a resident or a visitor."
      : step === 1
      ? "Pick the page that best describes you. You can add more pages later."
      : step === 2
      ? isVisitor
        ? "Add a profile photo, then tell us the city and state you are coming from."
        : "Add a profile photo, then tell us where you are based."
      : isVisitor
      ? "A visitor page keeps you in the loop while you are in town."
      : selected?.blurb ?? "Set up your page.";


  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <Toaster richColors />
      <ImageCropDialog
        file={rawFile}
        open={cropOpen}
        onOpenChange={setCropOpen}
        aspect={1}
        maxEdge={512}
        title="Crop your profile photo"
        onCropped={onCropped}
      />
      {previewMode && (
        <div className="fixed inset-x-0 top-0 z-50 bg-neutral-900 px-4 py-2 text-center text-xs font-semibold text-white">
          Admin preview, nothing you enter here is saved.
        </div>
      )}
      <Card className="w-full max-w-md border-orange-200">
        <CardHeader className="text-center">
          <Img src={pbLogo} alt="Logo" className="mx-auto mb-4 h-12 w-auto" />
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          <div className="mt-4" aria-hidden="true">
            <div className="mt-2 flex gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className="flex-1">
                  <span
                    className={`block h-1.5 rounded-full transition-colors ${
                      i + 1 < stepIndex ? "bg-orange-600" : i + 1 === stepIndex ? "bg-orange-500" : "bg-neutral-200"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>



        </CardHeader>
        <CardContent className="space-y-6">
          {step === 0 && (
            <>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => startAudience("resident")}
                  className="rounded-xl border border-neutral-200 p-4 text-left transition hover:border-orange-400 hover:bg-orange-50"
                >
                  <p className="font-semibold text-neutral-900">Resident</p>
                  <p className="text-xs text-neutral-500">I live in Baltimore. Next you pick Personal, Artist, Arts Organization or Business.</p>
                </button>
                <button
                  type="button"
                  onClick={() => startAudience("visitor")}
                  className="rounded-xl border border-neutral-200 p-4 text-left transition hover:border-orange-400 hover:bg-orange-50"
                >
                  <p className="font-semibold text-neutral-900">Visitor</p>
                  <p className="text-xs text-neutral-500">I am from somewhere else. Set me up with a visitor page.</p>
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-3">
                <Label>How do you want to join? <span className="text-orange-600">*</span></Label>
                <div className="grid gap-3">
                  {JOIN_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => chooseKind(o.value)}
                      className={`rounded-xl border p-4 text-left transition ${
                        kind === o.value
                          ? "border-orange-500 bg-orange-50"
                          : "border-neutral-200 hover:border-orange-400 hover:bg-orange-50"
                      }`}
                    >
                      <p className={`font-semibold ${kind === o.value ? "text-orange-700" : "text-neutral-900"}`}>
                        {o.label}
                      </p>
                      <p className="text-xs text-neutral-500">{o.blurb}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={continueFromKind} disabled={!kind} className="flex-1 bg-orange-600 text-white hover:bg-orange-700">
                  Continue
                </Button>

              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-col items-center gap-4">
                <p className="text-xs font-medium text-neutral-500">Profile photo <span className="text-orange-600">*</span></p>
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
                  accept="image/*,.heic,.heif"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" /> {file ? "Change photo" : "Choose photo"}
                </Button>
              </div>
              {isVisitor ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                  <div className="space-y-2">
                    <Label htmlFor="homeCity">City you are visiting from <span className="text-orange-600">*</span></Label>
                    <Input
                      id="homeCity"
                      value={homeCity}
                      onChange={(e) => {
                        setHomeCity(e.target.value);
                        setCityError(validateCity(e.target.value));
                      }}
                      onBlur={(e) => setCityError(validateCity(e.target.value))}
                      placeholder="e.g. Silver Spring"
                      maxLength={80}
                      aria-invalid={!!cityError}
                      className={cityError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {cityError && <p className="text-xs text-red-600">{cityError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homeState">State <span className="text-orange-600">*</span></Label>
                    <Select
                      value={homeState}
                      onValueChange={(v) => {
                        setHomeState(v);
                        setStateError(validateState(v));
                      }}
                    >
                      <SelectTrigger id="homeState" aria-invalid={!!stateError} className={stateError ? "border-red-500 focus:ring-red-500" : ""}>
                        <SelectValue placeholder="ST" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {stateError && <p className="text-xs text-red-600">{stateError}</p>}
                  </div>
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
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={backFromLocation} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={goStep3} disabled={!locationReady} className="flex-1 bg-orange-600 text-white hover:bg-orange-700">
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pageName">{nameLabel} <span className="text-orange-600">*</span></Label>
                <Input id="pageName" value={pageName} onChange={(e) => setPageName(e.target.value)} maxLength={80} />
              </div>
              {!isVisitor && kind === "artist" && (
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
                  {busy ? "Saving…" : `Create my ${pageLabel} page`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
