import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "motion/react";
import { useRef } from "react";
import { Search, ArrowDown, ArrowLeft, PartyPopper } from "lucide-react";
import heroSinger from "@/assets/hero-singer.jpg";
import musician from "@/assets/creator-musician.jpg";
import podcaster from "@/assets/creator-podcaster.jpg";
import illustrator from "@/assets/creator-illustrator.jpg";
import filmmaker from "@/assets/creator-filmmaker.jpg";
import chelsea from "@/assets/avatar-chelsea.jpg";
import pbLogo from "@/assets/pb-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Planet Baltimore — Your wildest creative reality" },
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
      <CreatorsFans />
      <Marquee />
      <Features />
      <Stats />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="absolute top-0 inset-x-0 z-50 px-6 md:px-10 pt-6">
      <div className="flex items-center justify-between text-paper">
        <nav className="hidden md:flex items-center gap-8 text-base font-medium">
          <NavLink href="#creators">Creators</NavLink>
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#">Pricing</NavLink>
          <NavLink href="#">Resources</NavLink>
          <a href="#" className="rounded-full border border-paper/70 px-5 py-2 text-sm hover:bg-paper hover:text-ink transition-colors">Updates</a>
        </nav>
        <motion.a
          href="#"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
        >
          <motion.img
            src={pbLogo.url}
            alt="Planet Baltimore"
            width={36}
            height={36}
            className="w-9 h-9 invert"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          />
          <span className="font-display text-lg md:text-xl font-extrabold tracking-tight uppercase hidden sm:inline">Planet Baltimore</span>
        </motion.a>
        <div className="flex items-center gap-3">
          <a href="#" className="hidden md:inline-flex items-center gap-2 rounded-full border border-paper/70 px-5 py-2 text-sm hover:bg-paper hover:text-ink transition-colors">
            <Search className="w-4 h-4" /> Find a Creator
          </a>
          <a href="#" className="hidden md:inline-flex rounded-full border border-paper/70 px-5 py-2 text-sm hover:bg-paper hover:text-ink transition-colors">Log in</a>
          <a href="#" className="rounded-full bg-paper text-ink px-5 py-2 text-sm font-medium hover:bg-ink hover:text-paper transition-colors">Get Started</a>
        </div>
      </div>
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
        <AnimatedHeadline lines={["Your wildest", "creative reality"]} />
      </div>

      {/* Featured creator card */}
      <motion.a
        href="#"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 1.2 }}
        whileHover={{ x: -4 }}
        className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-3 group"
      >
        <img src={podcaster} alt="" width={64} height={64} loading="lazy" className="w-14 h-14 rounded-full object-cover ring-2 ring-paper/50" />
        <span className="text-paper text-sm leading-snug max-w-[180px]">
          Jade Novah is fusing her loves of music, writing, and comedy <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </span>
      </motion.a>

      {/* Scroll cue */}
      <motion.a
        href="#creators"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-8 left-6 md:left-10 w-12 h-12 rounded-full border border-paper/70 text-paper flex items-center justify-center hover:bg-paper hover:text-ink transition-colors"
      >
        <ArrowDown className="w-5 h-5" />
      </motion.a>
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
        src={heroSinger}
        alt="A musician singing into a microphone bathed in blue studio light"
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

function CreatorsFans() {
  return (
    <section id="creators" className="bg-blue px-6 md:px-10 pt-32 pb-40">
      <div className="mx-auto max-w-[1400px] grid lg:grid-cols-[1.4fr_1fr] gap-16 items-start">
        <div>
          <ScrollHeadline
            lines={["Creators. Fans.", "Nothing in", "between."]}
            className="font-display text-ink font-medium text-[clamp(3rem,9vw,9.5rem)] leading-[0.9] tracking-[-0.05em]"
          />

          <div className="mt-20 max-w-md space-y-6 text-ink/90 text-lg leading-relaxed">
            <p>
              Planet Baltimore gives you a direct line of access to your fan community, with no ads or gatekeepers in the way.
            </p>
            <p>
              Through real-time group chats, comments, DMs, and even directly over email, you can connect more deeply and directly with your community here than anywhere else.
            </p>
            <motion.a
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              href="#"
              className="inline-flex rounded-full bg-ink text-paper px-7 py-4 text-base font-medium hover:bg-paper hover:text-ink transition-colors"
            >
              Build real community
            </motion.a>
          </div>
        </div>

        <ChatMockup />
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

function Marquee() {
  const items = ["Musicians", "Podcasters", "Illustrators", "Writers", "Game devs", "Filmmakers", "Educators", "Photographers", "Comedians"];
  return (
    <section className="bg-ink text-paper py-8 overflow-hidden border-y border-ink">
      <motion.div
        className="flex gap-16 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items, ...items].map((it, i) => (
          <span key={i} className="font-display text-4xl md:text-6xl font-medium tracking-[-0.04em] flex items-center gap-16">
            {it}
            <span className="text-blue">●</span>
          </span>
        ))}
      </motion.div>
    </section>
  );
}

function Features() {
  const items = [
    { title: "Memberships", body: "Free, paid, and one-time. Stack tiers however your work moves.", img: musician },
    { title: "Commerce", body: "Sell digital downloads, merch, and one-off drops next to your monthly memberships.", img: illustrator },
    { title: "Community", body: "Posts, chats, comments, and DMs that reach the people who pay attention.", img: filmmaker },
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
          Everything you need.<br />Nothing you don't.
        </motion.h2>

        <div className="mt-20 grid md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group rounded-3xl bg-ink text-paper overflow-hidden hover:-translate-y-2 transition-transform duration-500"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img src={it.img} alt="" loading="lazy" width={1024} height={1280} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-8">
                <h3 className="font-display text-3xl font-medium tracking-tight">{it.title}</h3>
                <p className="mt-3 text-paper/70 leading-relaxed">{it.body}</p>
              </div>
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
            <div className="font-display text-3xl font-extrabold tracking-tight">PATREON</div>
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
        <div className="font-display text-[clamp(4rem,20vw,22rem)] leading-[0.8] tracking-[-0.06em] font-medium">
          patreon
        </div>
      </div>
    </footer>
  );
}
