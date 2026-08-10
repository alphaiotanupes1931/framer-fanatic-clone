import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => pageHead({ path: "/privacy", title: "Privacy Policy | Planet Baltimore", description: "How Planet Baltimore collects, uses and protects your information." }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <AppLayout hero={false}>
    <main className="text-foreground">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        <h1 className="mt-6 text-3xl md:text-5xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: June 25, 2026</p>
        <div className="prose prose-neutral dark:prose-invert mt-8 space-y-6 text-[15px] leading-relaxed">
          <p>This Privacy Policy describes how Planet Baltimore ("we", "us") collects, uses, and shares information about you when you use our website and services.</p>
          <h2 className="text-xl font-semibold mt-8">Information we collect</h2>
          <p>Account information such as name, email, neighborhood, profile photo, and content you choose to post. We also collect basic usage data like pages viewed and device information.</p>
          <h2 className="text-xl font-semibold mt-8">How we use information</h2>
          <p>To operate the platform, authenticate you, surface relevant creators and events, process payments through Stripe, and keep the service safe.</p>
          <h2 className="text-xl font-semibold mt-8">Sharing</h2>
          <p>We share data with providers that help us run the service (hosting, database, payments). We do not sell your personal information.</p>
          <h2 className="text-xl font-semibold mt-8">Your rights</h2>
          <p>You can access, correct, or delete your data by visiting your settings or contacting us at terellebony@gmail.com.</p>
          <h2 className="text-xl font-semibold mt-8">Contact</h2>
          <p>Questions? Email terellebony@gmail.com.</p>
        </div>
      </div>
    </main>
    </AppLayout>
  );
}