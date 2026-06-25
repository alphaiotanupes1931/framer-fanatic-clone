import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import pbLogo from "@/assets/pb-logo.png";
import pbLogoDark from "@/assets/pb-logo-dark.png";
import aboutFounders from "@/assets/about-founders.png.asset.json";
import { assetUrl } from "@/lib/utils";
import heroBaltimore from "@/assets/hero-baltimore.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Planet Baltimore" },
      { name: "description", content: "Planet Baltimore is a platform built so Baltimore artists, makers, and organizers have a home of their own." },
      { property: "og:title", content: "About Planet Baltimore" },
      { property: "og:description", content: "A platform for Baltimore artists, makers, and organizers." },
      { property: "og:image", content: assetUrl(aboutFounders.url) },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <AboutNav />
      <Hero />
      <Story />
      <CTA />
    </div>
  );
}

function AboutNav() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <header className="sticky top-0 inset-x-0 z-50 px-5 md:px-10 py-4 bg-paper/85 backdrop-blur border-b border-ink/10">
      <div className="flex items-center justify-between text-ink">
        <Link to="/" className="flex items-center gap-2">
          <img src={pbLogo} alt="Planet Baltimore" width={32} height={32} className="w-8 h-8" />
          <span className="font-display text-base md:text-lg font-extrabold tracking-tight uppercase">Planet Baltimore</span>
        </Link>
        <nav className="hidden md:flex items-center gap-3 text-sm font-medium">
          <Link to="/" className="rounded-full px-4 py-2 hover:bg-ink/5 transition-colors">Home</Link>
          <Link to="/about" className="rounded-full px-4 py-2 bg-ink/5">About</Link>
          {signedIn ? (
            <Link to="/dashboard" className="rounded-full bg-ink text-paper px-5 py-2 hover:bg-orange transition-colors">Dashboard</Link>
          ) : (
            <Link to="/auth" className="rounded-full bg-ink text-paper px-5 py-2 hover:bg-orange transition-colors">Get Started</Link>
          )}
        </nav>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-ink/20">
          <Menu className="w-5 h-5" />
        </button>
      </div>
      <motion.div
        initial={false}
        animate={open ? { opacity: 1, pointerEvents: "auto" } : { opacity: 0, pointerEvents: "none" }}
        transition={{ duration: 0.25 }}
        className="md:hidden fixed inset-0 z-[60] bg-ink text-paper"
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2">
            <img src={pbLogoDark} alt="" width={32} height={32} className="w-8 h-8" />
            <span className="font-display text-base font-extrabold tracking-tight uppercase">Planet Baltimore</span>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-paper/40">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="px-6 mt-16 flex flex-col gap-6 font-display text-4xl tracking-[-0.04em]">
          <Link to="/" onClick={() => setOpen(false)} className="hover:text-blue transition-colors">Home</Link>
          <Link to="/about" onClick={() => setOpen(false)} className="hover:text-blue transition-colors">About</Link>
          <Link to={signedIn ? "/dashboard" : "/auth"} onClick={() => setOpen(false)} className="hover:text-blue transition-colors">{signedIn ? "Dashboard" : "Log in"}</Link>
        </nav>
      </motion.div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10 pt-10 md:pt-28 pb-6 md:pb-16">
        <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-16">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]"
            >
              A platform for Baltimore's
              <span className="block italic text-ink/55">artists and makers.</span>
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[16/10] md:aspect-[4/3] w-full overflow-hidden rounded-[24px] md:rounded-[36px] bg-ink/5"
          >
            <img
              src={heroBaltimore}
              alt="Planet Baltimore"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Story() {
  return (
    <section className="px-5 md:px-10 py-16 md:py-28">
      <div className="mx-auto grid max-w-[1100px] gap-12 md:grid-cols-[1fr_1.4fr] md:gap-20">
        <div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Our Story</h2>
        </div>
        <div className="space-y-6 text-[16px] leading-[1.75] text-ink/80 md:text-[17.5px]">
          <p>
            Planet Baltimore was made so artists could finally have a platform of their own. A place
            that isn't an algorithm chasing strangers in another city, but a corner of the internet
            that actually belongs to the painters, rappers, photographers, chefs, DJs, poets, and
            organizers shaping this city block by block.
          </p>
          <p>
            Baltimore runs on creativity. From the murals in Station North to the
            line cooks in Hampden, the harbor stages and the basement shows, the Sunday cookouts
            and the Saturday markets, this city is made by people who make things. Planet
            Baltimore exists so those people can find each other, hire each other, support each other,
            and get paid without a middleman taking the cut.
          </p>
          <p>
            One platform. One city. Every creator on it lives here, works here, and gets to keep
            what they earn here.
          </p>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-ink text-paper px-5 md:px-10 py-20 md:py-28">
      <div className="mx-auto max-w-[1100px] text-center">
        <h2 className="font-display text-[clamp(2.25rem,7vw,5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
          Join the platform built for Baltimore.
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth" className="inline-flex rounded-full bg-paper text-ink px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-orange hover:text-paper transition-colors">
            Get Started
          </Link>
          <Link to="/leaderboard" className="inline-flex rounded-full border border-paper/60 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-paper hover:text-ink transition-colors">
            Baltimore 100
          </Link>
        </div>
      </div>
    </section>
  );
}