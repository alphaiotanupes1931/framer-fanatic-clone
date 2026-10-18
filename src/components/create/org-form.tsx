import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { BANNER_SPEC } from "@/lib/media-guidelines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  confirmStaffEmailVerification,
  setStaffLogin,
  staffEmailProblem,
  startStaffEmailVerification,
} from "@/lib/staff-login.functions";
import { staffLoginCopy, supportsStaffLoginType } from "@/lib/staff-login-copy";
import { StaffVerifyScreen } from "@/components/create/staff-verify-screen";
import { orgSlug } from "@/lib/org-paths";

export type OrgType = "arts_org" | "business" | "community_assoc" | "group";

export function OrgForm({ type, kindLabel }: { type: OrgType; kindLabel: string }) {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Array<{ id: string; name: string }>>([]);
  // Arts organizations are public-facing listings, so they need enough detail
  // to be useful in the directory.
  const strict = type === "arts_org";
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    bio: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    neighborhood: "",
    avatar_url: "",
    banner_url: "",
    mission: "",
  });
  const [staff, setStaff] = useState({ username: "", password: "" });
  const [staffTouched, setStaffTouched] = useState(false);
  const [verify, setVerify] = useState<{ email: string; orgId: string; slug: string; name: string } | null>(null);
  // Inline email verification, done before the page exists.
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [staffCode, setStaffCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const supportsStaffLogin = supportsStaffLoginType(type);
  const staffCopy = staffLoginCopy(type);
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const staffEmail = staff.username.trim().toLowerCase();
  const staffEmailError = staff.username.trim() ? staffEmailProblem(staff.username) : null;
  const staffPasswordError = staff.password && staff.password.length < 8 ? `Password needs at least 8 characters (${staff.password.length} so far)` : null;
  const staffFilled = !!staff.username.trim() || !!staff.password;
  const staffValid = !staffEmailError && !!staffEmail && staff.password.length >= 8;
  const isVerified = !!verifiedEmail && verifiedEmail === staffEmail;
  const codePending = !!codeSentTo && codeSentTo === staffEmail && !isVerified;

  const sendCode = async () => {
    if (staffEmailError || !staffEmail || sendingCode) return;
    setSendingCode(true);
    try {
      await startStaffEmailVerification({ data: { email: staffEmail, pageName: form.name.trim() } });
      setCodeSentTo(staffEmail);
      setStaffCode("");
      toast.success(`Code sent to ${staffEmail}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the code");
    } finally {
      setSendingCode(false);
    }
  };

  const checkCode = async () => {
    if (checkingCode || staffCode.length !== 6) return;
    setCheckingCode(true);
    try {
      await confirmStaffEmailVerification({ data: { email: staffEmail, code: staffCode } });
      setVerifiedEmail(staffEmail);
      toast.success("Staff email verified");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That code did not work");
    } finally {
      setCheckingCode(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("neighborhoods").select("id,name").order("name");
      setNeighborhoods((data ?? []) as Array<{ id: string; name: string }>);
    })();
  }, []);

  const canSubmit = strict
    ? form.name.trim().length > 1 &&
      form.tagline.trim().length > 1 &&
      form.bio.trim().length > 9 &&
      form.mission.trim().length > 9 &&
      form.neighborhood.trim().length > 0 &&
      /.+@.+\..+/.test(form.email.trim())
    : type === "group" || type === "community_assoc"
      ? form.name.trim().length > 1 && form.tagline.trim().length > 1
      : form.name.trim().length > 1 && form.neighborhood.trim().length > 0;

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!form.neighborhood.trim() && type !== "group") { toast.error("Neighborhood is required"); return; }
    if (!canSubmit) {
      toast.error(strict ? "Please fill in every required field" : type === "group" || type === "community_assoc" ? "Name and short description are required" : "Name and neighborhood are required");
      return;
    }
    if (supportsStaffLogin && staffFilled) {
      setStaffTouched(true);
      if (staffEmailError) { toast.error(`Staff email: ${staffEmailError}`); return; }
      if (!staffEmail) { toast.error("Enter the staff email, or clear the staff password to skip the staff login"); return; }
      if (staffPasswordError || !staff.password) { toast.error(staffPasswordError ?? "Enter a staff password of at least 8 characters"); return; }
    }
    setSaving(true);
    try {
      const baseSlug = orgSlug(form.name);
      const slug = baseSlug;
      const { data, error } = await supabase.from("organizations").insert({
        owner_id: me.id,
        type,
        name: form.name.trim(),
        slug,
        tagline: form.tagline.trim() || null,
        bio: form.bio.trim() || null,
        website: form.website.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        banner_url: form.banner_url.trim() || null,
        mission: form.mission.trim() || null,
      }).select("id, slug").single();
      if (error) throw error;
      if (supportsStaffLogin && staffValid) {
        try {
          const res = await setStaffLogin({ data: { organizationId: data.id, username: staffEmail, password: staff.password } });
          if (res.needsVerification) {
            toast.success(`${kindLabel} created`);
            setVerify({ email: staffEmail, orgId: data.id, slug: data.slug, name: form.name.trim() });
            return;
          }
          toast.success(`${kindLabel} created. Staff login is verified and ready to use.`);
          navigate({ to: "/o/$slug", params: { slug: data.slug } });
          return;
        } catch (e) {
          toast.error(e instanceof Error ? e.message : `${kindLabel} created, but the staff login could not be saved`);
        }
      }
      toast.success(`${kindLabel} created`);
      navigate({ to: "/o/$slug", params: { slug: data.slug } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/row-level security|permission denied|policy/i.test(msg)) {
        toast.error(`Your account is not allowed to create a ${kindLabel.toLowerCase()} yet. Switch your profile role in Settings, or contact Planet Baltimore for access.`);
      } else if (/duplicate key|unique/i.test(msg)) {
        toast.error("That name is already taken. Try a slightly different one.");
      } else {
        toast.error(msg || "Could not create");
      }
    } finally {
      setSaving(false);
    }
  };

  if (verify) {
    return (
      <StaffVerifyScreen
        email={verify.email}
        organizationId={verify.orgId}
        pageName={verify.name || kindLabel}
        onVerified={() => {
          toast.success("Staff login is set up and verified");
          navigate({ to: "/o/$slug", params: { slug: verify.slug } });
        }}
        onSkip={() => {
          toast.message("Staff login created, but not verified yet", {
            description: "The email has to be verified before the staff login can be used to sign in.",
          });
          navigate({ to: "/o/$slug", params: { slug: verify.slug } });
        }}
      />
    );
  }

  return (
    <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
      <Field label={type === "business" ? "Business name" : "Name"} required>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder={`Your ${kindLabel.toLowerCase()} name`} />
      </Field>
      <Field label="Short description" required={strict || type === "group" || type === "community_assoc"}>
        <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={320} placeholder="One line describing what you do" />
        <p className="text-xs text-neutral-500">This shows right under your page name. Keep it short: 320 characters max ({form.tagline.length}/320).</p>
      </Field>
      <Field label="About" required={strict}>
        <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={4} maxLength={2000} />
      </Field>
      {(type === "arts_org" || type === "community_assoc" || type === "group") && (
        <Field label="Mission" required={strict}>
          <Textarea value={form.mission} onChange={(e) => set("mission", e.target.value)} rows={3} maxLength={2000} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Neighborhood" required={type !== "group"}>
          <select
            value={form.neighborhood}
            onChange={(e) => set("neighborhood", e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[#d4580a] focus:outline-none focus:ring-1 focus:ring-[#d4580a]/30"
          >
            <option value="">Select neighborhood...</option>
            {neighborhoods.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}
          </select>
        </Field>
        <Field label="Email" required={strict}>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={200} placeholder="contact@yourorg.org" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={200} />
        </Field>
      </div>
      <Field label="Website">
        <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" maxLength={200} />
      </Field>
      <div className="!mt-10 grid grid-cols-[1fr_2fr] gap-4">
        <Field label="Logo">
          <ImageUpload value={form.avatar_url} onChange={(v) => set("avatar_url", v)} label="Upload logo" bucket="avatars" aspect={1} />
        </Field>
        <Field label="Banner image">
          <ImageUpload value={form.banner_url} onChange={(v) => set("banner_url", v)} label="Upload background" bucket="avatars" aspect={3} hint={BANNER_SPEC} />
        </Field>
      </div>
      {supportsStaffLogin && (
        <div className="!mt-10 space-y-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{staffCopy.title}</h3>
            <p className="mt-1 text-xs text-neutral-600">
              {staffCopy.description}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={staffCopy.emailLabel}>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={staff.username}
                  autoComplete="off"
                  maxLength={80}
                  placeholder={staffCopy.placeholder}
                  aria-invalid={!!staffEmailError && staffTouched}
                  className={staffEmailError && staffTouched ? "border-red-400 focus-visible:ring-red-300" : isVerified ? "border-green-500" : undefined}
                  onBlur={() => setStaffTouched(true)}
                  onChange={(e) => setStaff((s) => ({ ...s, username: e.target.value }))}
                />
                {isVerified ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-green-50 px-2.5 text-xs font-semibold text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Verified
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={sendCode}
                    disabled={sendingCode || !staffEmail || !!staffEmailError}
                  >
                    {sendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : codePending ? "Resend" : "Send code"}
                  </Button>
                )}
              </div>
              {staffEmailError && staffTouched ? (
                <p className="text-xs text-red-600">{staffEmailError}</p>
              ) : isVerified ? (
                <p className="text-xs text-green-700">This email is verified. The staff login will work as soon as the page is created.</p>
              ) : null}
            </Field>
            <Field label={staffCopy.passwordLabel}>
              <Input
                type="password"
                value={staff.password}
                autoComplete="new-password"
                maxLength={72}
                placeholder="At least 8 characters"
                aria-invalid={!!staffPasswordError && staffTouched}
                className={staffPasswordError && staffTouched ? "border-red-400 focus-visible:ring-red-300" : undefined}
                onBlur={() => setStaffTouched(true)}
                onChange={(e) => setStaff((s) => ({ ...s, password: e.target.value }))}
              />
              {staffPasswordError && staffTouched && <p className="text-xs text-red-600">{staffPasswordError}</p>}
            </Field>
          </div>
          {codePending && (
            <div className="rounded-md border border-[#d4580a]/30 bg-white p-3">
              <p className="text-xs text-neutral-700">
                We sent a 6 digit code to <span className="font-semibold">{codeSentTo}</span>. Enter it here to verify.
              </p>
              <div className="mt-2 flex gap-2">
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void checkCode(); } }}
                  className="max-w-[160px] text-center tracking-[0.35em]"
                />
                <Button type="button" onClick={checkCode} disabled={checkingCode || staffCode.length !== 6}>
                  {checkingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={submit} disabled={!canSubmit || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create {kindLabel}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-orange"> *</span>}
      </Label>
      {children}
    </div>
  );
}