import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
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
      { title: "Planet Baltimore - Support what makes Baltimore" },
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
      <ScrollProgress />
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

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="fixed top-0 inset-x-0 z-[70] h-[3px] bg-paper origin-left pointer-events-none"
    />
  );
}


function Magnetic({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    x.set(dx * 0.28);
    y.set(dy * 0.35);
  }
  function onLeave() { x.set(0); y.set(0); }
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ x: sx, y: sy }} className={className}>
      {children}
    </motion.div>
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
    <header className="absolute top-0 inset-x-0 z-50 px-5 md:px-10 pt-5 md:pt-6">
      <div className="flex items-center justify-between text-paper">
        {/* Desktop left nav */}
        <nav className="hidden md:flex items-center gap-6 text-base font-medium">
          <Link to="/leaderboard" className="rounded-full border border-paper/70 px-5 py-2 text-sm hover:bg-paper hover:text-ink transition-colors">Baltimore 100</Link>
          <Link to="/about" className="rounded-full border border-paper/70 px-5 py-2 text-sm hover:bg-paper hover:text-ink transition-colors">About</Link>
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
            { href: "/leaderboard", label: "Baltimore 100" },
            { href: "/about", label: "About" },
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


function Hero() {
  return (
    <section className="relative min-h-[75vh] md:min-h-screen w-full overflow-hidden">
      <HeroParallax />
      <div className="absolute inset-0 bg-blue-deep/35 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-blue/40" />

      {/* Headline with per-word stagger */}
      <div className="absolute bottom-20 md:bottom-20 left-0 right-0 px-5 md:px-10 text-paper font-display font-medium text-[clamp(2.75rem,12vw,11rem)] leading-[0.9] md:leading-[0.88] tracking-[-0.04em] md:tracking-[-0.045em]">
        <AnimatedHeadline lines={["Support what", "makes Baltimore"]} />
      </div>

      {/* Mobile-only inline CTA so visitors aren't fishing for the hamburger */}
      <div className="absolute bottom-6 left-0 right-0 px-5 md:hidden flex items-center justify-center">
        <Link to="/auth" className="inline-flex justify-center rounded-full bg-paper text-ink px-6 py-3 text-sm font-medium">Get Started</Link>
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
      <div className="relative max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-32 lg:py-40">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-10 md:gap-14 lg:gap-20 items-center">
          {/* Portrait with parallax */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto lg:mx-0 w-full max-w-[260px] sm:max-w-[340px]"
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
              className="font-display text-[clamp(1.35rem,3.2vw,3.2rem)] leading-[1.2] md:leading-[1.15] tracking-[-0.02em]"
            />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 md:mt-10 font-display text-sm md:text-lg tracking-wide text-ink/60"
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
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glow = useTransform([gx, gy], ([x, y]) =>
    `radial-gradient(420px circle at ${x}% ${y}%, rgba(255,255,255,0.18), transparent 55%)`
  );

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 12);
    rx.set(-py * 12);
    gx.set(((e.clientX - r.left) / r.width) * 100);
    gy.set(((e.clientY - r.top) / r.height) * 100);
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
      className="group relative rounded-3xl bg-ink text-paper overflow-hidden will-change-transform"
    >
      {/* Cursor-follow spotlight */}
      <motion.div
        aria-hidden
        style={{ background: glow }}
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
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
      className="relative overflow-hidden bg-black px-5 md:px-10 py-20 md:py-24"
    >

      <div className="relative mx-auto max-w-[1400px]">
        <ScrollHeadline
          lines={["Turning passions", "into communities"]}
          className="font-display text-paper font-medium text-[clamp(2.5rem,10vw,11rem)] leading-[0.95] md:leading-[0.9] tracking-[-0.04em] md:tracking-[-0.05em] text-center"
        />

        <div className="mt-10 md:mt-14">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="grid sm:grid-cols-2 gap-12 sm:gap-10 lg:gap-12"
          >
            <div className="space-y-4 md:space-y-5">
              <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-paper tracking-tight">Build Your Community</h3>
              <p className="text-paper/85 text-[15px] md:text-lg leading-relaxed">
                Connect directly with Baltimore. No algorithms. No middlemen. Just you and the people who support what you do.
              </p>
              <motion.a
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                href="#"
                className="inline-flex rounded-full bg-paper text-ink px-6 py-3.5 md:px-7 md:py-4 text-sm md:text-base font-medium hover:bg-ink hover:text-paper transition-colors"
              >
                Start Building
              </motion.a>
            </div>

            <div className="space-y-4 md:space-y-5">
              <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-paper tracking-tight">Everything in One Place</h3>
              <p className="text-paper/85 text-[15px] md:text-lg leading-relaxed">
                Artists, businesses, neighborhoods, events. Follow what moves you. Support what matters. All of Baltimore, together.
              </p>
              <motion.a
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                href="#"
                className="inline-flex rounded-full border border-paper/80 text-paper px-6 py-3.5 md:px-7 md:py-4 text-sm md:text-base font-medium hover:bg-paper hover:text-ink transition-colors"
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
    <section id="features" className="bg-blue px-5 md:px-10 py-16 md:py-24">
      <div className="mx-auto max-w-[1400px]">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-display text-ink font-medium text-[clamp(2.25rem,7vw,7rem)] leading-[0.95] md:leading-[0.9] tracking-[-0.04em] md:tracking-[-0.05em] max-w-5xl"
        >
          Baltimore, fully connected.
        </motion.h2>

        <div className="mt-10 md:mt-20 grid md:grid-cols-3 gap-5 md:gap-6">
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
    <section className="bg-blue px-5 md:px-10 py-20 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9 }}
        className="mx-auto max-w-[1400px] text-center"
      >
        <h2 className="font-display text-ink font-medium text-[clamp(2.75rem,10vw,10rem)] leading-[0.92] md:leading-[0.88] tracking-[-0.04em] md:tracking-[-0.05em]">
          Start free.<br />Get paid tomorrow.
        </h2>
        <div className="mt-10 md:mt-12 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:justify-center">
          <Magnetic className="sm:inline-flex">
            <Link to="/auth" className="inline-flex w-full sm:w-auto justify-center rounded-full bg-ink text-paper px-6 py-3.5 md:px-8 md:py-4 text-sm md:text-base font-medium shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)] hover:bg-paper hover:text-ink transition-all">
              Get Started
            </Link>
          </Magnetic>
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
    <footer className="bg-ink text-paper px-5 md:px-10 py-14 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-2 md:grid-cols-[1.5fr_repeat(4,1fr)] gap-x-6 gap-y-10 md:gap-12 mb-14 md:mb-20">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <img src={pbLogo} alt="Planet Baltimore" width={36} height={36} className="w-9 h-9 shrink-0 invert" />
              <div className="font-display text-xl md:text-2xl font-extrabold tracking-tight uppercase truncate">Planet Baltimore</div>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h} className="min-w-0">
              <div className="text-[10px] md:text-xs uppercase tracking-widest text-paper/50 mb-3 md:mb-4">{c.h}</div>
              <ul className="space-y-2.5 md:space-y-3 text-sm">
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
          className="font-display text-[clamp(2.75rem,18vw,20rem)] leading-[0.85] md:leading-[0.8] tracking-[-0.05em] md:tracking-[-0.06em] font-medium uppercase break-words"
        >
          Planet Baltimore
        </motion.div>
      </div>
    </footer>
  );
}
