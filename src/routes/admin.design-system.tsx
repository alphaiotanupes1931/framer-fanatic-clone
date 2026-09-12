import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Bookmark, Check, Download, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chip } from "@/components/shared/chip";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { HeroBanner } from "@/components/shared/hero-banner";
import { ActionRow, ResponsiveGrid } from "@/components/shared/layout-primitives";
import { PageBackButton } from "@/components/shared/page-back-button";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { refreshAdminUnlocked } from "@/lib/admin-gate";

export const Route = createFileRoute("/admin/design-system")({
  component: DesignSystemPage,
  head: () => ({
    meta: [
      { title: "Design System | Planet Baltimore Admin" },
      { name: "description", content: "Private reference for Planet Baltimore interface patterns." },
      { property: "og:title", content: "Design System | Planet Baltimore Admin" },
      { property: "og:description", content: "Private reference for Planet Baltimore interface patterns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Swatch({ className, label, token }: { className: string; label: string; token: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className={`h-16 ${className}`} />
      <div className="p-3">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <code className="text-xs text-muted-foreground">{token}</code>
      </div>
    </div>
  );
}

function ExampleSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-border pt-8 first:border-0 first:pt-0">
      <SectionHeader title={title} description={description} />
      {children}
    </section>
  );
}

function DesignSystemPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState("Family Friendly");

  useEffect(() => {
    void refreshAdminUnlocked().then((ok) => {
      if (!ok) navigate({ to: "/admin/login" });
      else setReady(true);
    });
  }, [navigate]);

  if (!ready) {
    return <AdminShell><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading design system...</div></AdminShell>;
  }

  return (
    <AdminShell>
      <div className="space-y-10">
        <PageHeader
          title="Design System"
          eyebrow="Admin reference"
          description="The approved visual patterns for Planet Baltimore. Use this page when creating product documentation or reviewing new screens."
          back={<PageBackButton to="/admin" label="Back to admin" />}
        />

        <ExampleSection title="Color roles" description="Use these named roles instead of one-off colors in page code.">
          <ResponsiveGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <Swatch className="bg-background" label="Background" token="background" />
            <Swatch className="bg-card" label="Card" token="card" />
            <Swatch className="bg-foreground" label="Foreground" token="foreground" />
            <Swatch className="bg-orange" label="Brand" token="orange" />
            <Swatch className="bg-muted" label="Muted" token="muted" />
            <Swatch className="bg-destructive" label="Destructive" token="destructive" />
          </ResponsiveGrid>
        </ExampleSection>

        <ExampleSection title="Typography" description="One website font with a predictable hierarchy.">
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <h1 className="font-display text-4xl font-extrabold text-foreground">Page title</h1>
            <h2 className="font-display text-2xl font-bold text-foreground">Section heading</h2>
            <h3 className="text-lg font-semibold text-foreground">Card heading</h3>
            <p className="max-w-2xl text-base text-foreground">Body copy explains the primary information using clear, direct language.</p>
            <p className="text-sm text-muted-foreground">Secondary details use muted text without becoming difficult to read.</p>
          </div>
        </ExampleSection>

        <ExampleSection title="Buttons" description="Use text buttons for commands and icon buttons for familiar compact actions.">
          <ActionRow>
            <Button variant="brand"><Plus /> Primary action</Button>
            <Button>Neutral action</Button>
            <Button variant="outline"><Download /> Secondary</Button>
            <Button variant="ghost">Quiet action</Button>
            <Button variant="destructive"><Trash2 /> Delete</Button>
            <Button size="icon" variant="outline" aria-label="Notifications"><Bell /></Button>
            <Button variant="brand" disabled><Loader2 className="animate-spin" /> Saving</Button>
          </ActionRow>
        </ExampleSection>

        <ExampleSection title="Status and filters" description="Badges describe status. Chips change filters or selections.">
          <div className="space-y-4">
            <ActionRow>
              <Badge>Published</Badge>
              <Badge variant="secondary">Draft</Badge>
              <Badge variant="outline">Free</Badge>
              <Badge variant="destructive">Cancelled</Badge>
            </ActionRow>
            <ActionRow>
              {["This Weekend", "Free", "Family Friendly", "Outdoor"].map((item) => (
                <Chip key={item} selected={selected === item} onClick={() => setSelected(item)}>{item}</Chip>
              ))}
              <Chip removable onClick={() => setSelected("")}>Custom tag</Chip>
            </ActionRow>
          </div>
        </ExampleSection>

        <ExampleSection title="Page headers" description="Directory pages use the branded banner. Internal pages use the lightweight header.">
          <div className="space-y-6">
            <HeroBanner title="Festivals" subtitle="Discover Baltimore festivals, celebrations, performances, food, art and culture." cta={<Button variant="brand"><Plus /> Create festival</Button>} />
            <PageHeader title="Create a Festival" description="Set up the basics, then add schedules, artists, vendors, and tickets." back={<PageBackButton destination="festivals" />} actions={<Button variant="brand">Save draft</Button>} />
          </div>
        </ExampleSection>

        <ExampleSection title="Tabs" description="Tabs use one active treatment and support keyboard navigation.">
          <Tabs defaultValue="overview">
            <TabsList className="max-w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Overview content appears here.</TabsContent>
            <TabsContent value="schedule" className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Schedule content appears here.</TabsContent>
            <TabsContent value="tickets" className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Ticket content appears here.</TabsContent>
          </Tabs>
        </ExampleSection>

        <ExampleSection title="Cards and grids" description="Cards frame individual repeated items, not entire page sections.">
          <ResponsiveGrid>
            {["Festival", "Artist", "Neighborhood"].map((title) => (
              <Card key={title}>
                <CardHeader><CardTitle>{title}</CardTitle><CardDescription>Consistent title, description, and action spacing.</CardDescription></CardHeader>
                <CardContent><Button variant="outline" size="sm">View details</Button></CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        </ExampleSection>

        <ExampleSection title="Forms" description="Labels, hints, errors, height, focus, and required markers follow one pattern.">
          <div className="grid max-w-2xl gap-5 rounded-lg border border-border bg-card p-6 sm:grid-cols-2">
            <FormField label="Festival name" htmlFor="example-name" required><Input id="example-name" placeholder="Festival name" /></FormField>
            <FormField label="Neighborhood" htmlFor="example-neighborhood" hint="Choose the closest Baltimore neighborhood."><Input id="example-neighborhood" placeholder="Neighborhood" /></FormField>
            <FormField label="Description" htmlFor="example-description" className="sm:col-span-2"><Textarea id="example-description" placeholder="Tell people what to expect." /></FormField>
            <ActionRow className="justify-end sm:col-span-2"><Button variant="outline">Cancel</Button><Button variant="brand"><Check /> Save</Button></ActionRow>
          </div>
        </ExampleSection>

        <ExampleSection title="Empty states" description="Explain what is missing and offer one clear next action.">
          <EmptyState icon={Search} title="No festivals found" description="Try another search or clear the selected filters." action={<Button variant="outline">Clear filters</Button>} />
        </ExampleSection>

        <ExampleSection title="Spacing and layout" description="Use consistent page width, section rhythm, and responsive grids.">
          <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
            <ul className="grid gap-2 sm:grid-cols-2">
              <li><strong className="text-foreground">Page width:</strong> 1120 to 1600px, based on information density.</li>
              <li><strong className="text-foreground">Page gap:</strong> 24px between major sections.</li>
              <li><strong className="text-foreground">Card gap:</strong> 16px in standard grids.</li>
              <li><strong className="text-foreground">Touch target:</strong> At least 32px, preferably 40px on mobile.</li>
              <li><strong className="text-foreground">Card radius:</strong> 8px unless a media treatment needs more.</li>
              <li><strong className="text-foreground">Buttons:</strong> Fully rounded, with icons when the action benefits from one.</li>
            </ul>
          </div>
        </ExampleSection>
      </div>
    </AdminShell>
  );
}