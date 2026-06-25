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
    <section className="relative min-h-[80vh] md:min-h-screen w-full overflow-hidden">
      <HeroParallax />
      {/* Layered grading: softer top, deeper bottom for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-deep/20 via-blue-deep/10 to-blue-deep/70" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_100%,rgba(0,0,0,0.45),transparent_60%)]" />
      {/* Subtle grain */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }}
      />

      {/* Headline + sub + CTAs */}
      <div className="absolute bottom-10 md:bottom-16 left-0 right-0 px-5 md:px-10 text-paper">
        <div className="font-display font-medium text-[clamp(2.75rem,12vw,11rem)] leading-[0.9] md:leading-[0.88] tracking-[-0.04em] md:tracking-[-0.045em]">
          <AnimatedHeadline lines={["Support what", "makes Baltimore"]} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 md:mt-7 flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-10"
        >
          <p className="max-w-md text-sm md:text-base text-paper/80 leading-relaxed">
            A home for the creators, organizers, and neighbors building the city together.
          </p>

          <div className="hidden md:flex items-center gap-3">
            <Magnetic>
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 rounded-full bg-paper text-ink pl-6 pr-2 py-2 text-sm font-medium hover:bg-ink hover:text-paper transition-colors"
              >
                <span>Get Started</span>
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ink text-paper group-hover:bg-paper group-hover:text-ink transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </span>
              </Link>
            </Magnetic>
            <Link to="/about" className="text-sm text-paper/80 hover:text-paper underline-offset-4 hover:underline transition-colors">Learn more →</Link>
          </div>
        </motion.div>

        {/* Mobile CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 md:hidden"
        >
          <Link
            to="/auth"
            className="group inline-flex items-center gap-2 rounded-full bg-paper text-ink pl-5 pr-1.5 py-1.5 text-sm font-medium"
          >
            <span>Get Started</span>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ink text-paper">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </Link>
        </motion.div>
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
    <section ref={ref} className="relative w-full overflow-hidden bg-gradient-to-b from-paper via-paper to-blue">
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
        <span key={li} className="block">{line}</span>
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
      className="relative overflow-hidden bg-blue px-5 md:px-10 py-24 md:py-36"
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] max-w-[1200px] aspect-[16/10] bg-paper/[0.06] rounded-full blur-[140px] pointer-events-none"
      />
      {/* Top hairline to bridge from hero */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-paper/10" />

      <div className="relative mx-auto max-w-[1280px]">
        <ScrollHeadline
          lines={["Turning passions", "into communities"]}
          className="font-display text-paper font-medium text-[clamp(2.5rem,9vw,9rem)] leading-[0.95] md:leading-[0.9] tracking-[-0.04em] md:tracking-[-0.05em] text-center max-w-5xl mx-auto"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 md:mt-20 grid sm:grid-cols-2 gap-4 md:gap-5"
        >
          {[
            { t: "Build Your Community", b: "Connect directly with Baltimore. No algorithms. No middlemen. Just you and the people who support what you do.", cta: "Start Building", primary: true },
            { t: "Everything in One Place", b: "Artists, businesses, neighborhoods, events. Follow what moves you. Support what matters. All of Baltimore, together.", cta: "Explore", primary: false },
          ].map((c) => (
            <div
              key={c.t}
              className="group relative rounded-3xl border border-paper/10 bg-paper/[0.03] backdrop-blur-sm p-8 md:p-10 hover:border-paper/25 hover:bg-paper/[0.05] transition-colors"
            >
              <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-medium text-paper tracking-tight">{c.t}</h3>
              <p className="mt-4 text-paper/70 text-[15px] md:text-base leading-relaxed max-w-md">{c.b}</p>
              <a
                href="#"
                className={
                  "mt-8 inline-flex items-center gap-2 rounded-full pl-5 pr-1.5 py-1.5 text-sm font-medium transition-colors " +
                  (c.primary
                    ? "bg-paper text-ink hover:bg-ink hover:text-paper"
                    : "border border-paper/30 text-paper hover:bg-paper hover:text-ink")
                }
              >
                <span>{c.cta}</span>
                <span className={"inline-flex items-center justify-center w-7 h-7 rounded-full " + (c.primary ? "bg-ink text-paper" : "bg-paper/10 text-paper group-hover:bg-ink group-hover:text-paper")}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </span>
              </a>
            </div>
          ))}
        </motion.div>
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
    <section id="features" className="relative bg-[#3d68d9] px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[1280px]">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-display text-white font-medium text-[clamp(2.25rem,6.5vw,6.5rem)] leading-[0.95] md:leading-[0.9] tracking-[-0.04em] md:tracking-[-0.05em] max-w-5xl"
        >
          Baltimore, fully connected.
        </motion.h2>

        <div className="mt-12 md:mt-20 grid md:grid-cols-3 gap-4 md:gap-5">
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
    <section className="relative overflow-hidden bg-blue px-5 md:px-10 py-24 md:py-36">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-ink/10" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9 }}
        className="mx-auto max-w-[1280px] text-center"
      >
        <h2 className="font-display text-white font-medium text-[clamp(2.5rem,9vw,9rem)] leading-[0.92] md:leading-[0.88] tracking-[-0.04em] md:tracking-[-0.05em]">
          Start free.<br />Get paid tomorrow.
        </h2>
        <div className="mt-10 md:mt-14 flex justify-center">
          <Magnetic className="sm:inline-flex">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-ink text-paper pl-7 pr-2 py-2 text-sm md:text-base font-medium shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)] hover:bg-paper hover:text-ink transition-all"
            >
              <span>Get Started</span>
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-paper text-ink group-hover:bg-ink group-hover:text-paper transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </span>
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
