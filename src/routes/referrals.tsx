import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { ReferralNetworkDialog } from "@/components/referral-network-dialog";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";

export const Route = createFileRoute("/referrals")({
  component: ReferralsPage,
  head: () => ({
    meta: [
      { title: "Referrals | Planet Baltimore" },
      { name: "description", content: "Invite friends to Planet Baltimore and earn points toward Baltimore 100." },
      { property: "og:title", content: "Referrals | Planet Baltimore" },
      { property: "og:description", content: "Invite friends to Planet Baltimore and earn points toward Baltimore 100." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ReferralsPage() {
  const { profile } = useCurrentProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <AppLayout title="Referrals" hero={false}>
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
        <Gift className="mx-auto h-10 w-10" style={{ color: "#d4580a" }} />
        <h2 className="mt-3 font-display text-xl font-bold text-foreground">Your referral network</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All referral points go toward Baltimore 100.
        </p>
        <Button className="mt-5" onClick={() => setOpen(true)}>Open referral network</Button>
      </div>

      <ReferralNetworkDialog
        open={open}
        onClose={() => {
          setOpen(false);
          void navigate({ to: "/leaderboard" });
        }}
        profile={profile}
      />
    </AppLayout>
  );
}
