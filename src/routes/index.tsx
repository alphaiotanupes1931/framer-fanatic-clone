import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef } from "react";
import { Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroBaltimore from "@/assets/hero-baltimore.jpg";
import boomSelecta from "@/assets/boom-selecta.png";
import queenForADay from "@/assets/queen-for-a-day.png";
import terrellSpeaks from "@/assets/terrell-speaks.jpg";
import pbLogo from "@/assets/pb-logo.png";
import terrellStage from "@/assets/terrell-stage.png";
import baltimoreCommunityBg from "@/assets/baltimore-mural-v2.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Planet Baltimore — Support what makes Baltimore" },
      { name: "description", content: "Where Baltimore creators and fans build something meaningful together." },
    ],
    links: [
      { rel: "preload", as: "image", href: heroBaltimore, fetchpriority: "high" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-blue text-ink overflow-x-hidden font-sans">
      <Nav />
      <Hero />
      <CreatorsFans />
      <Features />
      <QuoteSection />
      
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <header className="absolute top-0 inset-x-0 z-50 px-6 md:px-10 pt-6">
      <div className="flex items-center justify-between text-paper">
        {/* Desktop left nav */}
        <nav className="hidden md:flex items-center gap-8 text-base font-medium">
          <NavLink href="#creators">Creators</NavLink>
          <NavLink href="#features">Features</NavLink>
          <Link to="/discover" className="group relative"><span className="relative inline-block overflow-hidden"><span className="block transition-transform duration-300 group-hover:-translate-y-full">Discover</span><span className="absolute inset-0 block translate-y-full transition-transform duration-300 group-hover:translate-y-0">Discover</span></span></Link>
          <Link to="/events" className="rounded-full border border-paper/70 px-5 py-2 text-sm hover:bg-paper hover:text-ink transition-colors">Events</Link>
        </nav>

        {/* Mobile/tablet logo (left-aligned) */}
        <motion.a
          href="#"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex md:hidden items-center gap-2"
        >
          <img
            src={pbLogo}
            alt="Planet Baltimore"
            width={32}
            height={32}
            className="w-8 h-8 invert"
          />
          <span className="font-display text-base font-extrabold tracking-tight uppercase">Planet Baltimore</span>
        </motion.a>

        {/* Desktop centered logo */}
        <motion.a
          href="#"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2"
        >
          <img
            src={pbLogo}
            alt="Planet Baltimore"
            width={36}
            height={36}
            className="w-9 h-9 invert"
          />
          <span className="font-display text-lg md:text-xl font-extrabold tracking-tight uppercase">Planet Baltimore</span>
        </motion.a>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/artists" className="inline-flex items-center gap-2 rounded-full border border-paper/70 px-5 py-2 text-sm hover:bg-paper hover:text-ink transition-colors">
            <Search className="w-4 h-4" /> Find a Creator
          </Link>
          {signedIn ? (
            <Link to="/dashboard" className="rounded-full bg-paper text-ink px-5 py-2 text-sm font-medium hover:bg-ink hover:text-paper transition-colors">Dashboard</Link>
          ) : (
            <>
              <Link to="/auth" className="rounded-full border border-paper/70 px-5 py-2 text-sm hover:bg-paper hover:text-ink transition-colors">Log in</Link>
              <Link to="/auth" className="rounded-full bg-paper text-ink px-5 py-2 text-sm font-medium hover:bg-ink hover:text-paper transition-colors">Get Started</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border border-paper/70 text-paper hover:bg-paper hover:text-ink transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile menu overlay */}
      <motion.div
        initial={false}
        animate={open ? { opacity: 1, pointerEvents: "auto" } : { opacity: 0, pointerEvents: "none" }}
        transition={{ duration: 0.3 }}
        className="md:hidden fixed inset-0 z-[60] bg-ink text-paper"
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2">
            <img src={pbLogo} alt="" width={32} height={32} className="w-8 h-8 invert" />
            <span className="font-display text-base font-extrabold tracking-tight uppercase">Planet Baltimore</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-paper/40 hover:bg-paper hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="px-6 mt-16 flex flex-col gap-6 font-display text-4xl tracking-[-0.04em]">
          {[
            { href: "#creators", label: "Creators" },
            { href: "#features", label: "Features" },
            { href: "/discover", label: "Discover" },
            { href: "/events", label: "Events" },
            { href: "/artists", label: "Find a Creator" },
            { href: signedIn ? "/dashboard" : "/auth", label: signedIn ? "Dashboard" : "Log in" },
          ].map((l) => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="hover:text-blue transition-colors">{l.label}</a>
          ))}
        </nav>
        <div className="px-6 mt-12">
          <Link to={signedIn ? "/dashboard" : "/auth"} onClick={() => setOpen(false)} className="inline-flex rounded-full bg-paper text-ink px-6 py-3 text-base font-medium">{signedIn ? "Go to Dashboard" : "Get Started"}</Link>
        </div>
      </motion.div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="group relative">
      <span className="relative inline-block overflow-hidden">
        <span className="block transition-transform duration-300 group-hover:-translate-y-full">{children}</span>
        <span className="absolute inset-0 block translate-y-full transition-transform duration-300 group-hover:translate-y-0">{children}</span>
      </span>
    </a>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <HeroParallax />
      <div className="absolute inset-0 bg-blue-deep/35 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-blue/40" />

      {/* Headline with per-word stagger */}
      <div className="absolute bottom-24 md:bottom-20 left-0 right-0 px-6 md:px-10 text-paper font-display font-medium text-[clamp(3rem,11vw,11rem)] leading-[0.88] tracking-[-0.045em]">
        <AnimatedHeadline lines={["Support what", "makes Baltimore"]} />
      </div>

    </section>
  );
}

function StaggeredQuote({ text, className }: { text: string; className?: string }) {
  return (
    <motion.blockquote
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {text}
    </motion.blockquote>
  );
}

function QuoteSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);

  return (
    <section ref={ref} className="relative w-full overflow-hidden bg-paper">
      <div className="relative max-w-[1200px] mx-auto px-6 md:px-10 py-24 md:py-32 lg:py-40">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-14 lg:gap-20 items-center">
          {/* Portrait with parallax */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto lg:mx-0 max-w-[340px]"
          >
            <motion.div style={{ y: imageY }}>
              <div className="relative aspect-square overflow-hidden rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
                <img
                  src={terrellSpeaks}
                  alt="Terrell Speaks"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Quote */}
          <div className="text-ink">
            <StaggeredQuote
              text="Planet Baltimore provides a space for artists to sustain ourselves by connecting us directly to our own communities."
              className="font-display text-[clamp(1.5rem,3.2vw,3.2rem)] leading-[1.15] tracking-[-0.02em]"
            />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 md:mt-10 font-display text-base md:text-lg tracking-wide text-ink/60"
            >
              Terrell Speaks
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroParallax() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  return (
    <motion.div ref={ref} style={{ y, scale }} className="absolute inset-0">
      <img
        src={heroBaltimore}
        alt="A vibrant event space filled with people connecting in Baltimore"
        width={1920}
        height={1080}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </motion.div>
  );
}

function AnimatedHeadline({ lines }: { lines: string[] }) {
  return (
    <h1>
      {lines.map((line, li) => (
        <span key={li} className="block overflow-hidden">
          <span className="block">
            {line.split(" ").map((word, wi) => (
              <span key={wi} className="inline-block overflow-hidden align-baseline mr-[0.25em]">
                <motion.span
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.55, delay: 0.05 + (li * line.split(" ").length + wi) * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block"
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </span>
        </span>
      ))}
    </h1>
  );
}

function ScrollHeadline({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <h2 className={className}>
      {lines.map((line, li) => (
        <span key={li} className="block overflow-hidden">
          {line.split(" ").map((word, wi) => (
            <span key={wi} className="inline-block overflow-hidden mr-[0.25em] align-baseline">
              <motion.span
                initial={{ y: "110%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: 0.03 * wi + li * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block"
              >
                {word}
              </motion.span>
            </span>
          ))}
        </span>
      ))}
    </h2>
  );
}

function TiltCard({ index, img, title, body }: { index: number; img: string; title: string; body: string }) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sy = useSpring(ry, { stiffness: 200, damping: 18 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 12);
    rx.set(-py * 12);
  }
  function onLeave() { rx.set(0); ry.set(0); }

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: sx, rotateY: sy, transformPerspective: 1000 }}
      className="group rounded-3xl bg-ink text-paper overflow-hidden will-change-transform"
    >
      <div className="aspect-[4/5] overflow-hidden">
        <motion.img
          src={img}
          alt=""
          loading="lazy"
          width={1024}
          height={1280}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <div className="p-8">
        <h3 className="font-display text-3xl font-medium tracking-tight">{title}</h3>
        <p className="mt-3 text-paper/70 leading-relaxed">{body}</p>
      </div>
    </motion.div>
  );
}

function CreatorsFans() {
  return (
    <section
      id="creators"
      className="relative overflow-hidden px-6 md:px-10 pt-10 pb-12"
    >
      {/* Background image */}
      <img
        src={baltimoreCommunityBg}
        alt="Baltimore skyline"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative mx-auto max-w-[1400px]">
        <ScrollHeadline
          lines={["Turning passions", "into communities"]}
          className="font-display text-paper font-medium text-[clamp(3rem,11vw,11rem)] leading-[0.9] tracking-[-0.05em] text-center"
        />

        <div className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="grid sm:grid-cols-2 gap-8 lg:gap-12"
          >
            <div className="space-y-5">
              <h3 className="font-display text-3xl md:text-4xl font-semibold text-paper tracking-tight">Build Your Community</h3>
              <p className="text-paper/85 text-base md:text-lg leading-relaxed">
                Connect directly with Baltimore. No algorithms. No middlemen. Just you and the people who support what you do.
              </p>
              <motion.a
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                href="#"
                className="inline-flex rounded-full bg-paper text-ink px-7 py-4 text-base font-medium hover:bg-ink hover:text-paper transition-colors"
              >
                Start Building
              </motion.a>
            </div>

            <div className="space-y-5">
              <h3 className="font-display text-3xl md:text-4xl font-semibold text-paper tracking-tight">Everything in One Place</h3>
              <p className="text-paper/85 text-base md:text-lg leading-relaxed">
                Artists, businesses, neighborhoods, events. Follow what moves you. Support what matters. All of Baltimore, together.
              </p>
              <motion.a
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                href="#"
                className="inline-flex rounded-full border border-paper/80 text-paper px-7 py-4 text-base font-medium hover:bg-paper hover:text-ink transition-colors"
              >
                Explore
              </motion.a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}



function Features() {
  const items = [
    { title: "Follow Local Creators", body: "Discover and follow Baltimore artists, musicians, podcasters, and makers. Stay in the loop with their latest work.", img: terrellStage },
    { title: "Community Feed", body: "A dedicated space for posts, updates, and conversations that keep the whole Baltimore creative scene connected.", img: boomSelecta },
    { title: "Direct Support", body: "Back the people shaping the city with free, paid, or one-time support. Your money goes straight to local creators.", img: queenForADay },
  ];
  return (
    <section id="features" className="bg-blue px-6 md:px-10 py-16">
      <div className="mx-auto max-w-[1400px]">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-display text-ink font-medium text-[clamp(2.5rem,7vw,7rem)] leading-[0.9] tracking-[-0.05em] max-w-5xl"
        >
          Baltimore, fully connected.
        </motion.h2>

        <div className="mt-20 grid md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <TiltCard key={i} index={i} img={it.img} title={it.title} body={it.body} />
          ))}
        </div>
      </div>
    </section>
  );
}


function CTA() {
  return (
    <section className="bg-blue px-6 md:px-10 py-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9 }}
        className="mx-auto max-w-[1400px] text-center"
      >
        <h2 className="font-display text-ink font-medium text-[clamp(3rem,10vw,10rem)] leading-[0.88] tracking-[-0.05em]">
          Start free.<br />Get paid tomorrow.
        </h2>
        <div className="mt-12 flex flex-wrap gap-3 justify-center">
          <Link to="/auth" className="inline-flex rounded-full bg-ink text-paper px-8 py-4 text-base font-medium hover:bg-paper hover:text-ink transition-colors">
            Get Started
          </Link>
          <Link to="/artists" className="inline-flex rounded-full border border-ink text-ink px-8 py-4 text-base font-medium hover:bg-ink hover:text-paper transition-colors">
            Find a Creator
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const cols: { h: string; l: { label: string; to: string }[] }[] = [
    { h: "Explore", l: [
      { label: "Discover", to: "/discover" },
      { label: "Events", to: "/events" },
      { label: "Calendar", to: "/calendar" },
      { label: "Neighborhoods", to: "/neighborhoods" },
    ]},
    { h: "Creators", l: [
      { label: "Artists", to: "/artists" },
      { label: "Arts Orgs", to: "/arts-orgs" },
      { label: "Businesses", to: "/businesses" },
      { label: "Groups", to: "/groups" },
    ]},
    { h: "Community", l: [
      { label: "Stories", to: "/stories" },
      { label: "Videos", to: "/videos" },
      { label: "Leaderboard", to: "/leaderboard" },
      { label: "Associations", to: "/community-associations" },
    ]},
    { h: "Account", l: signedIn ? [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Settings", to: "/settings" },
      { label: "Notifications", to: "/notifications" },
    ] : [
      { label: "Sign in", to: "/auth" },
      { label: "Sign up", to: "/auth" },
    ]},
  ];
  return (
    <footer className="bg-ink text-paper px-6 md:px-10 py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid md:grid-cols-[1.5fr_repeat(4,1fr)] gap-12 mb-20">
          <div>
            <div className="flex items-center gap-3">
              <img src={pbLogo} alt="Planet Baltimore" width={36} height={36} className="w-9 h-9 invert" />
              <div className="font-display text-2xl font-extrabold tracking-tight uppercase">Planet Baltimore</div>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div className="text-xs uppercase tracking-widest text-paper/50 mb-4">{c.h}</div>
              <ul className="space-y-3 text-sm">
                {c.l.map((i) => (<li key={i.label}><Link to={i.to} className="hover:text-blue transition-colors">{i.label}</Link></li>))}
              </ul>
            </div>
          ))}
        </div>
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-[clamp(4rem,18vw,20rem)] leading-[0.8] tracking-[-0.06em] font-medium uppercase"
        >
          Planet Baltimore
        </motion.div>
      </div>
    </footer>
  );
}
