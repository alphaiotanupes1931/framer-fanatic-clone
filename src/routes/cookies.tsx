import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy - Planet Baltimore" },
      { name: "description", content: "How Planet Baltimore uses cookies and local storage." },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-5 md:px-10 py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        <h1 className="mt-6 text-3xl md:text-5xl font-bold tracking-tight">Cookie Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: June 25, 2026</p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
          <p>Planet Baltimore uses cookies and local storage to keep you signed in, remember your theme preference, track tutorial progress, and improve performance.</p>
          <h2 className="text-xl font-semibold mt-8">Types of cookies</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Essential:</strong> authentication, session, security.</li>
            <li><strong>Preference:</strong> theme, cookie consent, onboarding state.</li>
            <li><strong>Analytics:</strong> basic usage metrics to improve the product.</li>
          </ul>
          <h2 className="text-xl font-semibold mt-8">Managing cookies</h2>
          <p>You can clear cookies in your browser settings at any time. Disabling essential cookies may prevent the service from working.</p>
        </div>
      </div>
    </main>
  );
}