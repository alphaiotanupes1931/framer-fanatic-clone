import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () => pageHead({ path: "/terms", title: "Terms of Service | Planet Baltimore", description: "The rules for using Planet Baltimore." }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-5 md:px-10 py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        <h1 className="mt-6 text-3xl md:text-5xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: June 25, 2026</p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
          <p>By using Planet Baltimore you agree to these Terms. If you do not agree, please do not use the service.</p>
          <h2 className="text-xl font-semibold mt-8">Accounts</h2>
          <p>You are responsible for your account, your content, and complying with applicable laws. Don't impersonate others or post unlawful content.</p>
          <h2 className="text-xl font-semibold mt-8">Content</h2>
          <p>You retain ownership of content you post. You grant us a license to display and distribute it on the platform.</p>
          <h2 className="text-xl font-semibold mt-8">Payments</h2>
          <p>Payments to artists and organizations are processed through Stripe. Platform fees, Stripe fees, and applicable Baltimore taxes may apply.</p>
          <h2 className="text-xl font-semibold mt-8">Termination</h2>
          <p>We may suspend or terminate accounts that violate these Terms or abuse the platform.</p>
          <h2 className="text-xl font-semibold mt-8">Contact</h2>
          <p>terellebony@gmail.com</p>
        </div>
      </div>
    </main>
  );
}