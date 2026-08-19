import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Camera, Upload } from "lucide-react";
import pbLogo from "@/assets/pb-logo.png";
import { Img } from "@/components/shared/smart-img";
import { STORED_URL_TTL, compressAvatar } from "@/lib/image-compress";

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>): { preview?: boolean } =>
    search['preview'] === "1" || search['preview'] === true ? { preview: true } : {},
  component: Onboarding,
  head: () => ({ meta: [{ title: "Welcome - set up your profile" }] }),
});

function Onboarding() {
  const navigate = useNavigate();
  const { preview: previewMode } = Route.useSearch();
  const [userId, setUserId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [isVisitor, setIsVisitor] = useState(false);
  const [homeCity, setHomeCity] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

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
          .select("category")
          .eq("id", uid)
          .maybeSingle()
          .then(({ data: p }) => {
            setIsVisitor(visitor || (p?.category ?? "") === "Visitor");
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

  const finish = async () => {
    if (previewMode) {
      toast.success("Preview only, nothing was saved.");
      navigate({ to: "/admin" });
      return;
    }
    if (!userId) return;
    if (!file) {
      return toast.error("Please add a profile photo to continue.");
    }
    if (isVisitor) {
      if (homeCity.trim().length < 2) {
        return toast.error("Please tell us where you are visiting from.");
      }
    } else if (!neighborhood) {
      return toast.error("Please choose your neighborhood.");
    }
    setBusy(true);
    try {
      let avatar_url: string | null = null;
      const compressed = await compressAvatar(file);
      const ext = compressed.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: compressed.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, STORED_URL_TTL);
      avatar_url = signed?.signedUrl ?? null;
      const { error } = await supabase
        .from("profiles")
        .update(
          isVisitor
            ? { avatar_url, city: homeCity.trim(), category: "Visitor", onboarded: true }
            : { avatar_url, neighborhood, onboarded: true },
        )
        .eq("id", userId);
      if (error) throw error;
      // If they arrived from a group invite, finish the trip there.
      let dest: string | null = null;
      try {
        const v = sessionStorage.getItem("pb_post_auth_redirect");
        if (v && v.startsWith("/") && !v.startsWith("//")) dest = v;
        sessionStorage.removeItem("pb_post_auth_redirect");
      } catch { /* ignore */ }
      if (dest) { window.location.replace(dest); return; }
      // Send them straight into the follow nudge so the feed isn't empty.
      navigate({ to: "/welcome" });
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
          <CardTitle className="text-2xl">Add a profile photo</CardTitle>
          <CardDescription>All fields below are required so your neighbors can recognize you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" /> {file ? "Change photo" : "Choose photo"}
            </Button>
            {!file && (
              <p className="text-xs text-neutral-500">A photo is required to continue.</p>
            )}
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
              <p className="text-xs text-neutral-500">This shows on your visitor profile.</p>
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
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => finish()}
              disabled={busy || (!previewMode && (!file || (isVisitor ? homeCity.trim().length < 2 : !neighborhood)))}
              className="w-full bg-orange-600 text-white hover:bg-orange-700"
            >
              {busy ? "Saving…" : "Continue"}
            </Button>
            {!previewMode && (!file || (isVisitor ? homeCity.trim().length < 2 : !neighborhood)) && (
              <p className="text-center text-xs text-neutral-500">
                {!file
                  ? "Add a profile photo to continue."
                  : isVisitor
                  ? "Tell us where you are visiting from to continue."
                  : "Choose your neighborhood to continue."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}