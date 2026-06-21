import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import musician from "@/assets/creator-musician.jpg";
import podcaster from "@/assets/creator-podcaster.jpg";
import illustrator from "@/assets/creator-illustrator.jpg";
import filmmaker from "@/assets/creator-filmmaker.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Patreon — Creativity, powered by membership" },
      { name: "description", content: "Where creators and fans build something meaningful together." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />
      <Hero />
      <Marquee />
      <Creators />
      <Features />
      <Stats />
      <Testimonial />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
          <span className="inline-block w-6 h-6 rounded-full bg-coral" />
          patreon
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#creators" className="hover:text-coral transition-colors">Creators</a>
          <a href="#features" className="hover:text-coral transition-colors">Features</a>
          <a href="#pricing" className="hover:text-coral transition-colors">Pricing</a>
          <a href="#" className="hover:text-coral transition-colors">Explore</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="#" className="hidden sm:inline text-sm font-medium hover:text-coral transition-colors">Log in</a>
          <a href="#" className="inline-flex items-center justify-center rounded-full bg-ink text-cream px-5 py-2.5 text-sm font-semibold hover:bg-coral transition-colors">
            Create on Patreon
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative pt-20 pb-32 px-6">
      <motion.div style={{ y, opacity }} className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
          Built for the next era of creators
        </motion.div>

        <h1 className="font-display font-medium text-[clamp(3rem,9vw,9rem)] leading-[0.9] tracking-tight max-w-6xl">
          Creativity,{" "}
          <span className="italic text-coral">powered</span>
          <br />
          by membership.
        </h1>

        <div className="mt-12 grid md:grid-cols-[1.2fr_1fr] gap-12 items-end">
          <p className="text-xl md:text-2xl text-muted-foreground max-w-xl leading-snug">
            A home for creators and the people who love what they make. Build recurring income, share the messy in-between, and grow a community that actually shows up.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#" className="inline-flex items-center justify-center rounded-full bg-coral text-accent-foreground px-7 py-4 text-base font-semibold hover:bg-ink transition-colors">
              Get started — it's free
            </a>
            <a href="#" className="inline-flex items-center justify-center rounded-full border border-ink text-ink px-7 py-4 text-base font-semibold hover:bg-ink hover:text-cream transition-colors">
              Find a creator
            </a>
          </div>
        </div>
      </motion.div>

      {/* Floating image collage */}
      <div className="mx-auto max-w-7xl mt-24 grid grid-cols-12 gap-4 md:gap-6">
        <FloatingCard src={musician} alt="Musician recording" className="col-span-6 md:col-span-4 aspect-[3/4] rotate-[-2deg]" delay={0} tag="Indie folk" priceColor="bg-coral" />
        <FloatingCard src={podcaster} alt="Podcaster" className="col-span-6 md:col-span-3 aspect-[3/4] mt-12 rotate-[1.5deg]" delay={0.1} tag="Weekly podcast" priceColor="bg-olive" />
        <FloatingCard src={illustrator} alt="Illustrator" className="col-span-6 md:col-span-3 aspect-[3/4] rotate-[-1deg]" delay={0.2} tag="Illustration" priceColor="bg-plum" />
        <FloatingCard src={filmmaker} alt="Filmmaker" className="col-span-6 md:col-span-2 aspect-[3/4] mt-8 rotate-[2deg]" delay={0.3} tag="Short films" priceColor="bg-ink" />
      </div>
    </section>
  );
}

function FloatingCard({
  src, alt, className, delay, tag, priceColor,
}: { src: string; alt: string; className: string; delay: number; tag: string; priceColor: string }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, rotate: 0 }}
      className={`relative overflow-hidden rounded-2xl bg-muted shadow-[0_30px_60px_-20px_rgba(20,15,10,0.25)] ${className}`}
    >
      <img src={src} alt={alt} loading="lazy" width={1024} height={1024} className="w-full h-full object-cover" />
      <figcaption className={`absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-full px-3 py-1.5 text-xs font-medium text-cream ${priceColor}`}>
        <span>{tag}</span>
        <span className="opacity-80">$5 / mo</span>
      </figcaption>
    </motion.figure>
  );
}

function Marquee() {
  const items = ["Musicians", "Podcasters", "Illustrators", "Writers", "Game devs", "Filmmakers", "Educators", "Photographers", "Comedians"];
  return (
    <section className="border-y border-border bg-cream py-6 overflow-hidden">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items, ...items].map((it, i) => (
          <span key={i} className="font-display text-3xl md:text-5xl font-medium tracking-tight flex items-center gap-12">
            {it}
            <span className="text-coral">✦</span>
          </span>
        ))}
      </motion.div>
    </section>
  );
}

function Creators() {
  const items = [
    { kicker: "01 / Musicians", title: "Release the album behind the album.", body: "Demos, voice memos, B-sides, and the live takes that didn't make the cut. Your real ones want all of it.", img: musician },
    { kicker: "02 / Podcasters", title: "Run the show ad-free, on your terms.", body: "Bonus episodes, ad-free feeds, and a private Discord where the conversation keeps going after the credits roll.", img: podcaster },
    { kicker: "03 / Visual artists", title: "Get paid for the process, not just the post.", body: "Share works-in-progress, timelapses, and PSDs. Sell originals and prints from the same place fans already follow you.", img: illustrator },
    { kicker: "04 / Filmmakers", title: "Fund the next short before the festival circuit.", body: "Sustain production with monthly support, drop director's cuts, and screen new work for your inner circle first.", img: filmmaker },
  ];
  return (
    <section id="creators" className="px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.95] max-w-4xl"
        >
          For every kind of <span className="italic text-coral">maker</span>.
        </motion.h2>
        <div className="mt-24 space-y-32">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={`grid md:grid-cols-2 gap-12 items-center ${i % 2 ? "md:[&>figure]:order-2" : ""}`}
            >
              <figure className="aspect-[4/5] rounded-3xl overflow-hidden bg-muted">
                <img src={it.img} alt={it.title} loading="lazy" width={1024} height={1024} className="w-full h-full object-cover" />
              </figure>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-coral font-semibold mb-6">{it.kicker}</div>
                <h3 className="font-display text-4xl md:text-6xl leading-[0.95]">{it.title}</h3>
                <p className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed">{it.body}</p>
                <a href="#" className="inline-flex items-center gap-2 mt-8 text-base font-semibold border-b-2 border-ink pb-1 hover:text-coral hover:border-coral transition-colors">
                  See examples →
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { title: "Memberships that fit", body: "Free, paid, and one-time. Stack tiers however your work moves.", icon: "◐" },
    { title: "Built-in commerce", body: "Sell digital downloads, merch, and one-off drops next to your monthly memberships.", icon: "◇" },
    { title: "A community, not a feed", body: "Posts, chats, comments, and DMs that actually reach the people who pay attention.", icon: "✦" },
    { title: "You own the relationship", body: "Email addresses, no algorithm in the middle, and tools to message anytime.", icon: "✱" },
    { title: "Insights worth reading", body: "See what's landing, who's leaving, and what to make next — without the dashboard fatigue.", icon: "◈" },
    { title: "Bring your fans with you", body: "Import from anywhere and link your existing socials in one click.", icon: "↗" },
  ];
  return (
    <section id="features" className="bg-ink text-cream px-6 py-32 rounded-t-[3rem]">
      <div className="mx-auto max-w-7xl">
        <div className="grid md:grid-cols-[1fr_1.2fr] gap-12 items-end mb-20">
          <div className="text-xs uppercase tracking-[0.2em] text-coral font-semibold">What you get</div>
          <h2 className="font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.95]">
            Everything you need to run an independent creative business.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-cream/10 rounded-3xl overflow-hidden">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className="bg-ink p-10 hover:bg-cream/5 transition-colors group"
            >
              <div className="text-4xl text-coral mb-6 group-hover:rotate-12 transition-transform">{f.icon}</div>
              <h3 className="font-display text-2xl mb-3">{f.title}</h3>
              <p className="text-cream/60 leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { n: "250k+", l: "Creators earning" },
    { n: "$8B+", l: "Paid to creators" },
    { n: "8M+", l: "Active members" },
    { n: "190", l: "Countries" },
  ];
  return (
    <section className="bg-ink text-cream px-6 pb-32">
      <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-cream/10 pt-16">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.08 }}
          >
            <div className="font-display text-5xl md:text-7xl font-medium">{s.n}</div>
            <div className="mt-2 text-sm text-cream/60 uppercase tracking-widest">{s.l}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="px-6 py-32 bg-background">
      <motion.blockquote
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mx-auto max-w-5xl text-center"
      >
        <div className="text-coral text-6xl font-display leading-none mb-8">"</div>
        <p className="font-display text-3xl md:text-5xl leading-tight">
          Patreon let me quit my day job. Not in the cliché way — in the boring, beautiful way where rent gets paid on the same day every month and I get to make the work I actually want to make.
        </p>
        <footer className="mt-12 flex items-center justify-center gap-4">
          <img src={podcaster} alt="" loading="lazy" width={64} height={64} className="w-14 h-14 rounded-full object-cover" />
          <div className="text-left">
            <div className="font-semibold">Maya Okonkwo</div>
            <div className="text-sm text-muted-foreground">Host, The Long Way Home</div>
          </div>
        </footer>
      </motion.blockquote>
    </section>
  );
}

function CTA() {
  return (
    <section id="pricing" className="px-6 pb-32">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mx-auto max-w-7xl rounded-[3rem] bg-coral text-cream px-8 md:px-20 py-24 md:py-32 relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-cream/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-ink/20 blur-3xl" />
        <div className="relative">
          <h2 className="font-display text-[clamp(2.5rem,7vw,6.5rem)] leading-[0.95] max-w-4xl">
            Start free. Get paid <span className="italic">tomorrow.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg md:text-xl text-cream/85">
            No setup fees, no contracts, no algorithms deciding who sees your work. Just you, your fans, and the work.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#" className="inline-flex items-center justify-center rounded-full bg-cream text-ink px-8 py-4 text-base font-semibold hover:bg-ink hover:text-cream transition-colors">
              Create your page
            </a>
            <a href="#" className="inline-flex items-center justify-center rounded-full border border-cream/40 text-cream px-8 py-4 text-base font-semibold hover:bg-cream hover:text-ink transition-colors">
              Talk to our team
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  const cols = [
    { h: "Product", l: ["Features", "Pricing", "Mobile apps", "Brand guidelines"] },
    { h: "Creators", l: ["Podcasters", "Video creators", "Musicians", "Writers", "Artists"] },
    { h: "Company", l: ["About", "Press", "Careers", "Newsroom"] },
    { h: "Resources", l: ["Help center", "Creator handbook", "Community guidelines", "Privacy"] },
  ];
  return (
    <footer className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid md:grid-cols-[1.5fr_repeat(4,1fr)] gap-12 mb-16">
          <div>
            <div className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
              <span className="inline-block w-6 h-6 rounded-full bg-coral" />
              patreon
            </div>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Creativity, powered by membership. © {new Date().getFullYear()}
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">{c.h}</div>
              <ul className="space-y-3 text-sm">
                {c.l.map((i) => (<li key={i}><a href="#" className="hover:text-coral transition-colors">{i}</a></li>))}
              </ul>
            </div>
          ))}
        </div>
        <div className="font-display text-[clamp(3rem,15vw,15rem)] leading-[0.85] text-ink/90 tracking-tighter">
          patreon
        </div>
      </div>
    </footer>
  );
}
