import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { CREATOR_CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({ meta: [{ title: "Welcome - set up your profile" }] }),
});

function Onboarding() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
      } else {
        setUserId(data.session.user.id);
      }
    });
  }, [navigate]);

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
    if (!userId) return;
    if (!file) {
      return toast.error("Please add a profile photo to continue.");
    }
    if (!neighborhood) {
      return toast.error("Please choose your neighborhood.");
    }
    if (!category) {
      return toast.error("Please choose what best describes you.");
    }
    setBusy(true);
    try {
      let avatar_url: string | null = null;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      avatar_url = signed?.signedUrl ?? null;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url, neighborhood, category, onboarded: true })
        .eq("id", userId);
      if (error) throw error;
      navigate({ to: "/dashboard" });
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
      <Card className="w-full max-w-md border-orange-200">
        <CardHeader className="text-center">
          <img src={pbLogo} alt="Logo" className="mx-auto mb-4 h-12 w-auto" />
          <CardTitle className="text-2xl">Add a profile photo</CardTitle>
          <CardDescription>A profile photo is required so your neighbors can recognize you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative h-32 w-32 overflow-hidden rounded-full border-4 border-dashed border-orange-300 bg-orange-50 transition hover:border-orange-500"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Your Baltimore neighborhood</Label>
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
          <div className="space-y-2">
            <Label htmlFor="category">What best describes you?</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {CREATOR_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-neutral-500">This shapes your public profile (Gallery, Episodes, Tracks…).</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => finish()}
              disabled={busy || !file || !neighborhood || !category}
              className="w-full bg-orange-600 text-white hover:bg-orange-700"
            >
              {busy ? "Saving…" : "Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}