import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "motion/react";
import { useRef } from "react";
import { Search, Menu, X, Calendar, MapPin } from "lucide-react";
import { useState } from "react";
import heroBaltimore from "@/assets/hero-baltimore.jpg.asset.json";
import musician from "@/assets/creator-musician.jpg";
import podcaster from "@/assets/creator-podcaster.jpg";
import illustrator from "@/assets/creator-illustrator.jpg";
import filmmaker from "@/assets/creator-filmmaker.jpg";
import terrellSpeaks from "@/assets/terrell-speaks.jpg.asset.json";
import pbLogo from "@/assets/pb-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Planet Baltimore — Support what makes Baltimore" },
      { name: "description", content: "Where Baltimore creators and fans build something meaningful together." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-blue text-ink overflow-x-hidden font-sans">
      <Nav />
      <Hero />
      <QuoteSection />
      <CreatorsFans />
      <Features />
      <Stats />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="absolute top-0 inset-x-0 z-50 px-6 md:px-10 pt-6">
      <div className="flex items-center justify-between text-paper">
        {/* Desktop left nav */}
        <nav className="hidden md:flex items-center gap-8 text-base font-medium">
          <NavLink href="#creators">Creators</NavLink>
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#">Resources</NavLink>
          <a href="#" className="rounded-full border border-paper/70 px-5 py-2 text-sm hover:bg-paper hover:text-ink transition-colors">Updates</a>
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
            src={pbLogo.url}
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
            src={pbLogo.url}
            alt="Planet Baltimore"
            width={36}
            height={36}
            className="w-9 h-9 invert"
          />
          <span className="font-display text-lg md:text-xl font-extrabold tracking-tight uppercase">Planet Baltimore</span>
        </motion.a>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3">
          <a href="#" className="inline-flex items-center gap-2 rounded-full border border-paper/70 px-5 py-2 text-sm hover:bg-paper hover:text-ink transition-colors">
            <Search className="w-4 h-4" /> Find a Creator
          </a>
          <a href="#" className="rounded-full border border-paper/70 px-5 py-2 text-sm hover:bg-paper hover:text-ink transition-colors">Log in</a>
          <a href="#" className="rounded-full bg-paper text-ink px-5 py-2 text-sm font-medium hover:bg-ink hover:text-paper transition-colors">Get Started</a>
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
            <img src={pbLogo.url} alt="" width={32} height={32} className="w-8 h-8 invert" />
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
            { href: "#", label: "Resources" },
            { href: "#", label: "Updates" },
            { href: "#", label: "Find a Creator" },
            { href: "#", label: "Log in" },
          ].map((l) => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="hover:text-blue transition-colors">{l.label}</a>
          ))}
        </nav>
        <div className="px-6 mt-12">
          <a href="#" onClick={() => setOpen(false)} className="inline-flex rounded-full bg-paper text-ink px-6 py-3 text-base font-medium">Get Started</a>
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
  const words = text.split(" ");
  return (
    <blockquote className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden mr-[0.25em]">
          <motion.span
            initial={{ y: "110%" }}
            whileInView={{ y: "0%" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: 0.8,
              delay: 0.04 * i,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="inline-block"
          >
            {word}
          </motion.span>
        </span>
      ))}
    </blockquote>
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
    <section ref={ref} className="relative w-full overflow-hidden bg-ink">
      {/* Bridge gradient from hero blue tones */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-deep/40 to-transparent pointer-events-none" />

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
              <div className="relative aspect-square overflow-hidden rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                <img
                  src={terrellSpeaks.url}
                  alt="Terrell Speaks"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Quote */}
          <div className="text-paper">
            <StaggeredQuote
              text="Planet Baltimore provides a space for artists to sustain ourselves by connecting us directly to our own communities."
              className="font-display text-[clamp(1.5rem,3.2vw,3.2rem)] leading-[1.15] tracking-[-0.02em]"
            />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 md:mt-10 font-display text-base md:text-lg tracking-wide text-paper/60"
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
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1.2]);
  return (
    <motion.div ref={ref} style={{ y, scale }} className="absolute inset-0">
      <img
        src={heroBaltimore.url}
        alt="A vibrant event space filled with people connecting in Baltimore"
        width={1920}
        height={1080}
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
                  transition={{ duration: 0.9, delay: 0.2 + (li * line.split(" ").length + wi) * 0.08, ease: [0.22, 1, 0.36, 1] }}
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
                transition={{ duration: 0.9, delay: 0.05 * wi + li * 0.15, ease: [0.22, 1, 0.36, 1] }}
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
      className="relative overflow-hidden px-6 md:px-10 pt-24 pb-32 bg-[radial-gradient(120%_80%_at_50%_0%,#a8c3ff_0%,#6b8df0_55%,#4a6fd8_100%)]"
    >
      <div className="mx-auto max-w-[1400px]">
        <ScrollHeadline
          lines={["Turning passions", "into communities"]}
          className="font-display text-ink font-medium text-[clamp(3rem,11vw,11rem)] leading-[0.9] tracking-[-0.05em] text-center"
        />

        <div className="mt-20 grid lg:grid-cols-[1fr_1.2fr] gap-16 lg:gap-24 items-center">
          <EventsMockup />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="grid sm:grid-cols-2 gap-10 lg:gap-14 pb-4"
          >
            <div className="space-y-5">
              <h3 className="font-display text-3xl md:text-4xl font-semibold text-ink tracking-tight">More ways to earn</h3>
              <p className="text-ink/85 text-base md:text-lg leading-relaxed">
                On Planet Baltimore, you can build a lasting livelihood outside the ad-based ecosystem, with revenue streams ranging from memberships and merch to shows, workshops, and direct community support.
              </p>
              <motion.a
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                href="#"
                className="inline-flex rounded-full bg-ink text-paper px-7 py-4 text-base font-medium hover:bg-paper hover:text-ink transition-colors"
              >
                Set up shop
              </motion.a>
            </div>

            <div className="space-y-5">
              <h3 className="font-display text-3xl md:text-4xl font-semibold text-ink tracking-tight">Unlock growth</h3>
              <p className="text-ink/85 text-base md:text-lg leading-relaxed">
                Planet Baltimore isn't just for creative growth, it's for professional growth too. Get in-depth analytics about your fans, dig into powerful relationship tools, and tap into a thriving Baltimore creator community.
              </p>
              <motion.a
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                href="#"
                className="inline-flex rounded-full border border-ink/80 text-ink px-7 py-4 text-base font-medium hover:bg-ink hover:text-paper transition-colors"
              >
                Explore tools
              </motion.a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ChatMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl bg-chat-bg p-5 shadow-[0_30px_80px_-20px_rgba(0,0,30,0.35)] max-w-md mx-auto w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-ink/10">
        <button className="w-9 h-9 rounded-full bg-paper/70 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="font-semibold text-ink">Chelsea Devantez's chat</div>
          <div className="text-xs text-ink/60">Chelsea Devantez · View Details</div>
        </div>
        <img src={chelsea} alt="" width={40} height={40} loading="lazy" className="w-10 h-10 rounded-lg object-cover" />
      </div>

      <div className="pt-5 space-y-5">
        <ChatBubble
          name=""
          avatar={chelsea}
          color="bg-paper"
          text="started this and cant wait to hear your book reccs!!!!"
          reactions={["❤️", "📕"]}
          replies="2 replies"
          newCount={1}
          align="left"
        />
        <ChatMessage avatar={chelsea} name="Maya Joseph" time="3m" emoji="🎉" />
        <ChatBubble
          name="Chelsea Devantez"
          tag="CREATOR"
          time="3m"
          avatar={chelsea}
          color="bg-[#9bb0a3]"
          text="so glad everyone is here 😌"
          reactions={["💬", "❤️"]}
          replies="6 replies"
          newCount={2}
          align="left"
          dark
        />
        <ChatMessage avatar={chelsea} name="Kai Nady" time="3m" text="ok, who's seen a movie thats better than the book?" replies="2 replies" newCount={1} />
        <div className="flex gap-3">
          <img src={chelsea} alt="" width={36} height={36} loading="lazy" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm text-ink">Susie Kennedy</span>
              <span className="text-xs text-ink/50">· 3m</span>
            </div>
            <div className="mt-1 text-sm text-ink">after your last review i HAD to read this!</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ChatBubble({
  name, tag, time, avatar, color, text, reactions, replies, newCount, dark,
}: {
  name: string; tag?: string; time?: string; avatar: string; color: string;
  text: string; reactions: string[]; replies: string; newCount: number;
  align?: string; dark?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <img src={avatar} alt="" width={36} height={36} loading="lazy" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {name && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-semibold text-sm text-ink">{name}</span>
            {tag && <span className="text-[10px] font-bold tracking-wider bg-ink/80 text-paper px-1.5 py-0.5 rounded">{tag}</span>}
            {time && <span className="text-xs text-ink/50">· {time}</span>}
          </div>
        )}
        <div className={`${color} ${dark ? "text-paper" : "text-ink"} rounded-2xl rounded-tl-md px-4 py-3 text-sm inline-block max-w-full`}>
          {text}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex -space-x-1 bg-paper rounded-full px-2 py-1 text-sm">
            {reactions.map((r, i) => <span key={i}>{r}</span>)}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <div className="flex -space-x-1.5">
            <img src={chelsea} alt="" className="w-4 h-4 rounded-full ring-2 ring-chat-bg" />
            <img src={podcaster} alt="" className="w-4 h-4 rounded-full ring-2 ring-chat-bg" />
          </div>
          <span className="text-ink/60">{replies}</span>
          <span className="text-emerald-700 font-medium">· {newCount} New</span>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ avatar, name, time, emoji, text, replies, newCount }: {
  avatar: string; name: string; time: string; emoji?: string; text?: string; replies?: string; newCount?: number;
}) {
  return (
    <div className="flex gap-3">
      <img src={avatar} alt="" width={36} height={36} loading="lazy" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm text-ink">{name}</span>
          <span className="text-xs text-ink/50">· {time}</span>
        </div>
        {emoji && <div className="mt-1 text-3xl"><PartyPopper className="w-7 h-7 text-amber-500 inline" /></div>}
        {text && <div className="mt-1 text-sm text-ink">{text}</div>}
        {replies && (
          <div className="flex items-center gap-3 mt-2 text-xs">
            <div className="flex -space-x-1.5">
              <img src={chelsea} alt="" className="w-4 h-4 rounded-full ring-2 ring-chat-bg" />
              <img src={podcaster} alt="" className="w-4 h-4 rounded-full ring-2 ring-chat-bg" />
            </div>
            <span className="text-ink/60">{replies}</span>
            {newCount && <span className="text-emerald-700 font-medium">· {newCount} New</span>}
          </div>
        )}
      </div>
    </div>
  );
}


function Features() {
  const items = [
    { title: "Follow Local Creators", body: "Discover and follow Baltimore artists, musicians, podcasters, and makers. Stay in the loop with their latest work.", img: musician },
    { title: "Community Feed", body: "A dedicated space for posts, updates, and conversations that keep the whole Baltimore creative scene connected.", img: illustrator },
    { title: "Direct Support", body: "Back the people shaping the city with free, paid, or one-time support. Your money goes straight to local creators.", img: filmmaker },
  ];
  return (
    <section id="features" className="bg-blue px-6 md:px-10 py-32">
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

function Stats() {
  const stats = [
    { n: "250k+", l: "Creators earning" },
    { n: "$8B+", l: "Paid to creators" },
    { n: "8M+", l: "Active members" },
    { n: "190", l: "Countries" },
  ];
  return (
    <section className="bg-ink text-paper px-6 md:px-10 py-32">
      <div className="mx-auto max-w-[1400px] grid grid-cols-2 md:grid-cols-4 gap-12">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.08 }}
          >
            <div className="font-display text-6xl md:text-8xl font-medium tracking-[-0.05em]">{s.n}</div>
            <div className="mt-3 text-sm text-paper/60 uppercase tracking-widest">{s.l}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-blue px-6 md:px-10 py-32">
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
          <a href="#" className="inline-flex rounded-full bg-ink text-paper px-8 py-4 text-base font-medium hover:bg-paper hover:text-ink transition-colors">
            Get Started
          </a>
          <a href="#" className="inline-flex rounded-full border border-ink text-ink px-8 py-4 text-base font-medium hover:bg-ink hover:text-paper transition-colors">
            Find a Creator
          </a>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  const cols = [
    { h: "Product", l: ["Features", "Pricing", "Mobile apps", "Brand"] },
    { h: "Creators", l: ["Podcasters", "Video", "Musicians", "Writers", "Artists"] },
    { h: "Company", l: ["About", "Press", "Careers", "Newsroom"] },
    { h: "Resources", l: ["Help center", "Handbook", "Community", "Privacy"] },
  ];
  return (
    <footer className="bg-ink text-paper px-6 md:px-10 py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid md:grid-cols-[1.5fr_repeat(4,1fr)] gap-12 mb-20">
          <div>
            <div className="flex items-center gap-3">
              <img src={pbLogo.url} alt="Planet Baltimore" width={36} height={36} className="w-9 h-9 invert" />
              <div className="font-display text-2xl font-extrabold tracking-tight uppercase">Planet Baltimore</div>
            </div>
            <p className="mt-4 text-sm text-paper/60 max-w-xs">
              Your wildest creative reality. © {new Date().getFullYear()}
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div className="text-xs uppercase tracking-widest text-paper/50 mb-4">{c.h}</div>
              <ul className="space-y-3 text-sm">
                {c.l.map((i) => (<li key={i}><a href="#" className="hover:text-blue transition-colors">{i}</a></li>))}
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
