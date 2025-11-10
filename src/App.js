import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles, Gift, Trophy, ShieldCheck, Twitter, MessageCircle, Play, Copy, ExternalLink, Crown, Medal, Timer, Users, Instagram } from "lucide-react";
import useLeaderboardCountdown from "./useLeaderboardCountdown";

// —— Brand Tokens ——
const BRAND_PRIMARY = "#6366f1";
const BRAND_SECONDARY = "#22d3ee";
const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND_PRIMARY}, ${BRAND_SECONDARY})`;

function DiscordIcon({ size = 24, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2496-1.8447-.2763-3.68-.2763-5.4868 0-.1636-.4008-.4058-.8743-.6177-1.2496a.076.076 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.5153.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0536 1.5073 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8926a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0742.0742 0 01.0776-.0105c3.9276 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0096c.1202.099.246.1981.372.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.8732.8916.0766.0766 0 00-.0406.1067c.3608.698.7723 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9487-1.5222 6.0023-3.0294a.077.077 0 00.0312-.0551c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0285zM8.02 15.3312c-1.1825 0-2.1569-1.0847-2.1569-2.419 0-1.3344.9555-2.4189 2.157-2.4189 1.2104 0 2.1757 1.0962 2.1568 2.4189 0 1.3343-.9555 2.419-2.1569 2.419zm7.9748 0c-1.1825 0-2.1569-1.0847-2.1569-2.419 0-1.3344.9554-2.4189 2.1569-2.4189 1.2104 0 2.1758 1.0962 2.1569 2.4189 0 1.3343-.9465 2.419-2.1569 2.419Z" />
    </svg>
  );
}

// —— Very light hash-based router (no extra deps) ——
function useHashRoute() {
  const [path, setPath] = useState(() => window.location.hash.replace("#", "") || "/");
  useEffect(() => {
    const onHash = () => setPath(window.location.hash.replace("#", "") || "/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (to) => {
    if (!to.startsWith("#/")) to = `#${to.startsWith("/") ? to : "/" + to}`;
    if (window.location.hash !== to) window.location.hash = to;
  };
  return { path, navigate };
}

export default function App() {
  const { path } = useHashRoute();

  // Map hash path → page
  let Page = HomePage;
  if (path.startsWith("/bonuses")) Page = BonusesPage;
  if (path.startsWith("/leaderboards")) Page = LeaderboardsPage;
  if (path.startsWith("/rules")) Page = RulesPage;

  return (
    <Layout>
      <Page />
    </Layout>
  );
}

// —— Shared Layout: background, particles, navbar, footer ——
function Layout({ children }) {
  return (
    <div
      className="relative min-h-screen text-white overflow-hidden selection:bg-white/20 selection:text-white"
      style={{ backgroundColor: "#040513" }}
    >
      {/* BACKGROUND LAYERS */}
      <Noise />
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: `radial-gradient(circle at 18% 18%, ${BRAND_PRIMARY}20, transparent 55%), radial-gradient(circle at 80% 12%, ${BRAND_SECONDARY}18, transparent 60%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06), transparent 50%, rgba(15,23,42,0.8))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />
      </div>

      {/* PARTICLES */}
      <Particles />

      {/* NAVBAR */}
      <Navbar />

      {/* PAGE CONTENT */}
      <main className="relative z-20">{children}</main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

function Particles() {
  useEffect(() => {
    const canvas = document.getElementById("particles");
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let particlesArray = [];

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener("resize", setSize);

    function Particle(startBottom) {
      this.reset = function (sb) {
        const startFromBottom = typeof sb === "boolean" ? sb : false;
        this.x = Math.random() * canvas.width;
        this.y = startFromBottom ? canvas.height + Math.random() * canvas.height : canvas.height + Math.random() * 160;
        this.size = Math.random() * 1.6 + 0.7;
        this.speedY = -(Math.random() * 0.7 + 0.35);
        this.speedX = Math.random() * 0.3 - 0.15;
        this.alpha = Math.random() * 0.5 + 0.3;
        this.wobble = Math.random() * Math.PI * 2;
      };
      this.update = function () {
        this.y += this.speedY;
        this.x += Math.sin((this.wobble += 0.03)) * 0.15 + this.speedX;
        if (this.y < -20) this.reset(true);
      };
      this.draw = function () {
        ctx.save();
        ctx.beginPath();
        ctx.shadowBlur = 18;
        ctx.shadowColor = `rgba(217,119,6,${this.alpha})`;
        ctx.fillStyle = `rgba(217,119,6,${this.alpha})`;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      this.reset(typeof startBottom === "boolean" ? startBottom : true);
    }

    function init() {
      particlesArray = [];
      for (let i = 0; i < 200; i++) particlesArray.push(new Particle(true));
    }
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particlesArray) {
        p.update();
        p.draw();
      }
      raf = requestAnimationFrame(animate);
    }

    init();
    animate();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setSize);
    };
  }, []);

  return <canvas id="particles" className="fixed top-0 left-0 w-full h-full z-10 pointer-events-none" />;
}

// —— Navbar & Footer (shared everywhere) ——
function Navbar() {
  const [open, setOpen] = useState(false);
  const link = (to, label) => (
    <a
      href={`#${to}`}
      className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors hover:text-white hover:bg-white/10"
    >
      {label}
    </a>
  );
  return (
    <nav className="relative z-30 pt-8">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.05] px-5 py-4 backdrop-blur-xl supports-[backdrop-filter]:bg-white/[0.05]" style={{ boxShadow: "0 25px 80px -40px rgba(99,102,241,0.45)" }}>
          <div className="flex items-center gap-3">
            <div
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl"
              style={{ backgroundImage: BRAND_GRADIENT, boxShadow: "0 15px 35px -15px rgba(34,211,238,0.7)" }}
            >
              <div className="absolute inset-0 flex items-center justify-center font-black text-lg tracking-tight text-white">
                BB
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight" style={{ color: BRAND_PRIMARY }}>
                BankBros Collective
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-300/80">
                Rewards Reimagined
              </div>
            </div>
          </div>

          <ul className="hidden md:flex items-center gap-1 text-gray-200">
            <li>{link("/", "Home")}</li>
            <li>{link("/leaderboards", "Leaderboards")}</li>
            <li>{link("/bonuses", "Bonuses")}</li>
            <li>{link("/rules", "Rules")}</li>
          </ul>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://discord.gg/bankbros"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/80 hover:text-white hover:border-white/40"
            >
              <DiscordIcon size={18} />
              Join Discord
            </a>
            <a
              href="https://www.instagram.com/bankbros"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:text-white hover:border-white/40"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </a>
          </div>

          <button
            aria-label="Toggle menu"
            className="md:hidden rounded-2xl border border-white/15 px-3 py-2 text-sm text-white/80"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden mx-auto mt-3 max-w-6xl px-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
            <div className="grid gap-2 text-sm text-gray-200">
              {link("/", "Home")}
              {link("/leaderboards", "Leaderboards")}
              {link("/bonuses", "Bonuses")}
              {link("/rules", "Rules")}
            </div>
            <div className="mt-4 flex items-center gap-3 text-white/80">
              <a
                href="https://discord.gg/bankbros"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
              >
                <DiscordIcon size={18} />
                Join Discord
              </a>
              <a
                href="https://www.instagram.com/bankbros"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10"
              >
                <Instagram size={18} />
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="relative z-20 mt-20 border-t border-white/10 bg-black/70 backdrop-blur">
      <div className="absolute inset-x-0 -top-20 h-20" aria-hidden>
        <div
          className="mx-auto h-full w-full max-w-5xl rounded-full blur-3xl"
          style={{ backgroundImage: BRAND_GRADIENT, opacity: 0.25 }}
        />
      </div>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr,1fr,1fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3">
              <div
                className="h-11 w-11 rounded-2xl"
                style={{ backgroundImage: BRAND_GRADIENT, boxShadow: "0 18px 40px -18px rgba(34,211,238,0.65)" }}
              />
              <div>
                <div className="text-xl font-bold tracking-tight" style={{ color: BRAND_PRIMARY }}>
                  BankBros Collective
                </div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">EST. 2024</div>
              </div>
            </div>
            <p className="text-sm text-slate-300/80">
              A forward-looking rewards club crafted for our community of grinders. Daily drops, real-time leaderboards, and
              VIP experiences built around transparency.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://discord.gg/bankbros"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/90 hover:bg-white/20"
              >
                <DiscordIcon size={18} />
                Join the Lounge
              </a>
              <a
                href="https://kick.com/bankbros"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-white"
              >
                <Play size={16} />
                Watch Live
              </a>
            </div>
          </div>
          <FooterCol
            title="Navigation"
            links={[
              { label: "Home", href: "#/" },
              { label: "Leaderboards", href: "#/leaderboards" },
              { label: "Bonuses", href: "#/bonuses" },
              { label: "Rules", href: "#/rules" },
            ]}
          />
          <FooterCol
            title="Connect"
            links={[
              { label: "Discord", href: "https://discord.gg/bankbros" },
              { label: "Kick", href: "https://kick.com/bankbros" },
              { label: "Instagram", href: "https://www.instagram.com/bankbros" },
              { label: "X", href: "https://twitter.com/bankbros" },
            ]}
          />
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500/80 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} BankBros Collective. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="https://bankbros.vercel.app/terms" className="hover:text-white" target="_blank" rel="noopener noreferrer">
              Terms
            </a>
            <a href="https://bankbros.vercel.app/privacy" className="hover:text-white" target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
            <a
              href="https://bankbros.vercel.app/responsible-play"
              className="hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              Responsible Play
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="font-semibold uppercase tracking-widest text-xs text-white/60">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="relative inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:text-white">
              <span className="h-1 w-1 rounded-full" style={{ background: BRAND_GRADIENT }} />
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Noise() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 mix-blend-soft-light opacity-[0.06]"
      style={{
        backgroundImage:
          "url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 200 200\\'><filter id=\\'n\\'><feTurbulence type=\\'fractalNoise\\' baseFrequency=\\'.8\\' numOctaves=\\'2\\' stitchTiles=\\'stitch\\'/></filter><rect width=\\'100%\\' height=\\'100%\\' filter=\\'url(%23n)\\'/></svg>')",
        backgroundSize: "auto",
      }}
    />
  );
}

// =========================================================
// Pages
// =========================================================

// —— Home (based on BankBros hero/sections) ——
function HomePage() {
  const heroRef = useRef(null);
  const scrollObj = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const orbOpacity = useTransform(scrollObj.scrollYProgress || 0, [0, 1], [0.35, 0]);

  return (
    <>
      {/* HERO */}
      <section ref={heroRef} className="relative z-20 px-6 pt-24 pb-20 md:pb-32">
        <motion.div
          style={{ opacity: orbOpacity }}
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
        >
          <div
            className="h-[65vmin] w-[65vmin] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle at center, ${BRAND_PRIMARY}33, transparent 60%)` }}
          />
        </motion.div>

        <div className="mx-auto flex max-w-6xl flex-col gap-16 md:grid md:grid-cols-[1.15fr,1fr] md:items-center">
          <div className="space-y-10 text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70"
            >
              <Sparkles size={14} /> Season VIII Live Now
            </motion.div>

            <motion.h1
              className="text-4xl font-black leading-[1.1] text-white sm:text-5xl md:text-6xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
            >
              Power up with the
              <span
                className="ml-2 inline-block bg-clip-text text-transparent"
                style={{ backgroundImage: BRAND_GRADIENT }}
              >
                BankBros Collective
              </span>
            </motion.h1>

            <motion.p
              className="max-w-xl text-base text-slate-300/90 sm:text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
            >
              Track leaderboards in real time, unlock bespoke bonuses, and access exclusive drops for our verified members. It’s
              everything you loved about the original hub, reframed for the next era.
            </motion.p>

            <motion.div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7 }}
            >
              {[
                { label: "Active Players", value: "1.4K" },
                { label: "Season Rewards", value: "$8.5K" },
                { label: "Daily Drops", value: "3" },
              ].map((s) => (
                <div key={s.label} className="rounded-3xl border border-white/10 bg-white/[0.05] px-4 py-5 shadow-[0_25px_80px_-45px_rgba(99,102,241,0.55)]">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{s.label}</div>
                  <div className="mt-2 text-2xl font-extrabold" style={{ color: BRAND_SECONDARY }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div
              className="flex flex-col gap-4 sm:flex-row sm:items-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            >
              <a
                href="#/leaderboards"
                className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-base font-semibold text-white"
                style={{ backgroundImage: BRAND_GRADIENT, boxShadow: "0 30px 90px -40px rgba(34,211,238,0.75)" }}
              >
                <Trophy size={18} /> View Live Leaderboard
              </a>
              <a
                href="#/bonuses"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-8 py-3 text-base font-semibold text-white/80 hover:text-white"
              >
                <Gift size={18} /> Explore Bonuses
              </a>
            </motion.div>

            <motion.div
              className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-slate-400"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2">
                <ShieldCheck size={14} style={{ color: BRAND_SECONDARY }} /> Verified payouts
              </div>
              <div className="inline-flex items-center gap-2">
                <Timer size={14} style={{ color: BRAND_SECONDARY }} /> Reset every 14 days
              </div>
              <div className="inline-flex items-center gap-2">
                <Users size={14} style={{ color: BRAND_SECONDARY }} /> Community-first support
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_35px_120px_-45px_rgba(34,211,238,0.8)]"
          >
            <div className="absolute -top-24 right-0 h-48 w-48 rounded-full blur-3xl" style={{ background: `${BRAND_SECONDARY}33` }} />
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/60">
              <span>Current Cycle</span>
              <span>Ends in {`<`}14d</span>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/50 p-5">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>Next Reward Drop</span>
                <span className="font-semibold" style={{ color: BRAND_SECONDARY }}>
                  $500 Cash
                </span>
              </div>
              <div className="mt-6 flex items-end gap-3">
                {[72, 100, 84].map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-2">
                    <div className="w-full rounded-2xl bg-white/10">
                      <div
                        className="rounded-2xl"
                        style={{ backgroundImage: BRAND_GRADIENT, height: `${h}%` }}
                      />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                      {['Top 50', 'Top 10', 'Top 3'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/60 p-4">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>Invite friends</span>
                <button className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
                  <Copy size={14} /> Copy link
                </button>
              </div>
              <p className="mt-3 text-xs text-white/60">
                Share your referral to unlock co-op bonuses and double drops during blitz events.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative z-20 px-6 pb-24">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-white/10 bg-white/[0.04] px-8 py-14 backdrop-blur-xl">
          <div className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-black text-white sm:text-4xl">
                A transparent climb from your first wager to the champions lounge
              </h2>
              <p className="mt-4 text-base text-slate-300/90">
                We’ve rebuilt the BankBros experience with clarity front and center. Connect your account, play on our partner
                sites, and watch the leaderboard respond instantly.
              </p>
              <div className="mt-8 space-y-5">
                {[
                  {
                    icon: <ShieldCheck size={18} />,
                    title: "Connect & verify",
                    desc: "Use our secure tracked links and promo code so every wager is captured in your personal feed.",
                  },
                  {
                    icon: <Trophy size={18} />,
                    title: "Compete for tiers",
                    desc: "Rise through five prize tiers with escalating cash, merch, and IRL experience drops.",
                  },
                  {
                    icon: <Sparkles size={18} />,
                    title: "Unlock bonuses",
                    desc: "Milestone chests, surprise blitz events, and co-op missions keep the grind fresh.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-black/50 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundImage: BRAND_GRADIENT }}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-white">{item.title}</div>
                      <div className="mt-1 text-sm text-slate-300/80">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
                <a href="#/rules" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-white/80 hover:text-white">
                  <Timer size={14} /> Review Rules
                </a>
                <a href="#/leaderboards" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-white/80 hover:text-white">
                  <ExternalLink size={14} /> Open Leaderboard
                </a>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/60 p-6 shadow-[0_30px_110px_-60px_rgba(99,102,241,0.7)]">
              <div className="mb-5 flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/50">
                <span>Snapshot</span>
                <span>Updated live</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                <LeaderboardPreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section className="relative z-20 px-6 pb-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-3xl font-black text-white sm:text-4xl">Where the collective hangs out</h3>
              <p className="mt-2 max-w-xl text-sm text-slate-300/80">
                Tune into our broadcasts, hop into strategy chats, or scroll highlights from the community. Every space has a
                dedicated crew keeping things on-brand.
              </p>
            </div>
            <a
              href="https://discord.gg/bankbros"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 hover:text-white"
            >
              <ExternalLink size={14} /> All Channels
            </a>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Kick Broadcast",
                desc: "Watch live bankrolls, giveaways, and community challenges twice a week.",
                href: "https://kick.com/bankbros",
                icon: <Play size={18} />,
                tag: "Streaming",
              },
              {
                title: "Discord Lounge",
                desc: "Drop receipts, track leaderboards, and vibe with the squad in themed channels.",
                href: "https://discord.gg/bankbros",
                icon: <MessageCircle size={18} />,
                tag: "Community",
              },
              {
                title: "Highlights on X",
                desc: "Instant updates on winners, collabs, and flash missions.",
                href: "https://x.com/bankbros",
                icon: <Twitter size={18} />,
                tag: "News",
              },
            ].map((item) => (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] p-6 transition hover:border-white/25"
                style={{ boxShadow: "0 35px 120px -60px rgba(99,102,241,0.65)" }}
              >
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ backgroundImage: BRAND_GRADIENT, mixBlendMode: "soft-light" }} />
                <div className="relative flex flex-col gap-5">
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/70">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70">
                      {item.icon}
                    </span>
                    {item.tag}
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white">{item.title}</h4>
                    <p className="mt-2 text-sm text-slate-300/80">{item.desc}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
                    Enter space <ChevronDown className="-rotate-90" size={16} />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ / Rules preview */}
      <section id="rules" className="relative z-20 px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <h3 className="text-3xl font-black text-white sm:text-4xl">
            Everything you need to know before you grind
          </h3>
          <p className="mt-2 text-sm text-slate-300/80">
            Transparent rules, tracked wagers, and support that actually replies. Start with the essentials below.
          </p>
          <div className="mt-8 space-y-3">
            {faqItems.map((f, i) => (
              <Accordion key={f.q} defaultOpen={i === 0} question={f.q} answer={f.a} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// —— Bonuses (adapted from your BonusesPage) ——
function BonusesPage() {
  const [copied, setCopied] = useState(false);
  const steps = [
    {
      id: 1,
      title: "Visit Roobet & Sign Up",
      desc: (
        <>
          Head to Roobet using our tracked link and create your account. When prompted, enter the promo code <b style={{ color: BRAND_PRIMARY }}>BANKBROS</b> so every $1 you wager counts toward BankBros bonuses and the leaderboard.
        </>
      ),
      img: "/roobet.png",
      ctaText: "SignUp on Roobet",
      ctaHref: "https://roobet.com/?ref=bankbros",
      external: true,
    },
    {
      id: 2,
      title: "Verify Your Account",
      desc: <>Complete KYC (identity verification) and secure your profile. Verified accounts unlock all promos and leaderboard prizes.</>,
      img: "/verify.png",
      ctaText: "Verify Account",
      ctaHref: "https://roobet.com/?ref=bankbros",
      external: true,
    },
    {
      id: 3,
      title: "Enjoy Bonuses & Auto-Entry",
      desc: <>
        Claim exclusive bonuses, weekly drops, and reloads. Your wagers are <i>automatically</i> tracked toward the BankBros Leaderboard.
      </>,
      img: "/leaderboard2d.png",
      ctaText: "View Leaderboards",
      ctaHref: "#/leaderboards",
      external: false,
    },
  ];

  return (
    <>
      {/* HEADER */}
      <header className="relative z-20 border-b border-white/10 bg-black/60 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Bonuses</h1>
          <p className="mt-3 text-gray-300">How to register, claim perks, and get auto-entered into the BankBros leaderboard.</p>

          {/* Promo Code */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm" style={{ borderColor: "rgba(99,102,241,0.45)", boxShadow: "0 0 0 1px rgba(255,255,255,0.05)" }}>
            <span className="opacity-80">Promo code:</span>
            <code className="font-bold tracking-wider" style={{ color: BRAND_PRIMARY }}>BANKBROS</code>
            <button
              onClick={() => { navigator.clipboard.writeText("BANKBROS"); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
              className="ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs border"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            >
              <Copy size={14} />{copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </header>

      {/* STEPS */}
      <section className="relative z-20 px-6 py-14">
        <div className="mx-auto max-w-6xl space-y-12">
          {steps.map((s, i) => (
            <div key={s.id} className={`grid md:grid-cols-2 gap-8 items-center ${i % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""}`}>
              {/* Text */}
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Step {s.id}</div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-white" style={{ textShadow: "0 0 40px rgba(99,102,241,0.4)" }}>{s.title}</h2>
                <p className="text-gray-300 mb-5">{s.desc}</p>

                <a
                  href={s.ctaHref}
                  {...(s.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-white"
                  style={{ backgroundImage: BRAND_GRADIENT, boxShadow: "0 25px 70px -35px rgba(34,211,238,0.7)" }}
                >
                  {s.ctaText}
                  {s.external ? <ExternalLink size={16} /> : <Trophy size={16} />}
                </a>

                {/* Slim tips */}
                {s.id === 2 && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                    <ShieldCheck size={14} /> Secure your account for full bonuses.
                  </div>
                )}
                {s.id === 3 && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                    <Sparkles size={14} /> Weekly drops for active players.
                  </div>
                )}
              </div>

              {/* Image */}
              <div>
                <div
                  className="w-full aspect-[16/10] rounded-2xl overflow-hidden border backdrop-blur flex items-center justify-center"
                  style={{ borderColor: "rgba(148,163,184,0.2)", borderWidth: 1, boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 35px 90px -45px rgba(99,102,241,0.4)" }}
                >
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function LeaderboardsPage() {
  // --- 1) Hardcoded fallback (kept simple; prize = 0 so mapping is the source of truth) ---
  const FALLBACK = React.useMemo(
    () => ([
      { rank: 1,  name: "BossBaby", wagered: 342130.32, prize: 0 },
      { rank: 2,  name: "BossBaby", wagered: 298220.18, prize: 0 },
      { rank: 3,  name: "BossBaby", wagered: 251980.55, prize: 0 },
      { rank: 4,  name: "BossBaby", wagered: 203140.00, prize: 0 },
      { rank: 5,  name: "BossBaby", wagered: 181120.45, prize: 0 },
      { rank: 6,  name: "BossBaby", wagered: 166780.12, prize: 0 },
      { rank: 7,  name: "BossBaby", wagered: 154210.00, prize: 0 },
      { rank: 8,  name: "BossBaby", wagered: 141033.47, prize: 0 },
      { rank: 9,  name: "BossBaby", wagered: 132440.87, prize: 0 },
      { rank: 10, name: "BossBaby", wagered: 120008.03, prize: 0 },
      { rank: 11, name: "BossBaby", wagered: 110000.00, prize: 0 },
      { rank: 12, name: "BossBaby", wagered: 100000.00, prize: 0 },
      { rank: 13, name: "BossBaby", wagered:  90000.00, prize: 0 },
      { rank: 14, name: "BossBaby", wagered:  80000.00, prize: 0 },
      { rank: 15, name: "BossBaby", wagered:  70000.00, prize: 0 },
    ]),
    []
  );

  // --- 2) Live state fed by the API (or fallback) ---
  const [rows, setRows] = React.useState(FALLBACK);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showHistory, setShowHistory] = React.useState(false);
  // store previously fetched leaderboard entries
  const [historyData, setHistoryData] = React.useState([]);
  const [historyRange, setHistoryRange] = React.useState({ start: "", end: "" });
  const [historyLoading, setHistoryLoading] = React.useState(true);

  // --- 3) NEW prize mapping (1–6) ---
  const prizeByRank = React.useMemo(() => ({
    1: 175,
    2: 125,
    3: 100,
    4: 80,
    5: 65,
    6: 55,
    7: 0,  8: 0,  9: 0,  10: 0,
    11: 0, 12: 0, 13: 0, 14: 0, 15: 0,
  }), []);

  const API_URL = "https://bankbros.vercel.app/api/leaderboard/top"; // <-- sample endpoint
  const HISTORY_URL = "https://bankbros.vercel.app/api/leaderboard/previous";
  console.log("Leaderboard API_URL:", API_URL); // leave this for debugging

  // --- 4) Feature toggle: keep fallback while you test ---
  const forceMock = (typeof window !== "undefined") && window.location.hash.includes("mock");

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (forceMock) {
        setLoading(false);
        return; // keep FALLBACK visible
      }
      try {
        const r = await fetch(API_URL, { headers: { "Accept": "application/json" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const items = (j.items ?? []).map((x) => ({
          rank: x.rank,
          name: x.username,
          wagered: Number(x.wagered || 0),
          // DO NOT trust API prize — always map from our ladder:
          prize: prizeByRank[x.rank] ?? 0,
        }));

        if (!alive) return;

        setRows(items.length ? items : FALLBACK);
        setError(items.length ? "" : "No live data yet – showing sample data.");
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setRows(FALLBACK);
        setError("Couldn’t load live data – showing sample data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [API_URL, prizeByRank, forceMock, FALLBACK]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(HISTORY_URL, { headers: { "Accept": "application/json" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const items = (j.items ?? []).map((x) => ({
          rank: x.rank,
          name: x.username,
          wagered: Number(x.wagered || 0),
          prize: prizeByRank[x.rank] ?? 0,
        }));
        if (!alive) return;
        setHistoryData(items);
        setHistoryRange({ start: j.period_start, end: j.period_end });
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setHistoryData([]);
        setHistoryRange({ start: "", end: "" });
      } finally {
        if (alive) setHistoryLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [HISTORY_URL, prizeByRank]);

  // --- 5) Normalize prizes AGAIN at render-time (so fallback never leaks old values) ---
  const viewRows = React.useMemo(
    () => rows.map(r => ({ ...r, prize: prizeByRank[r.rank] ?? 0 })),
    [rows, prizeByRank]
  );

  // --- 6) Layout slices + countdown values ---
  const top3 = viewRows.slice(0, 3);      // [1st, 2nd, 3rd]
  const rest = viewRows.slice(3, 15);     // 4..15
  const { days, hours, minutes, seconds } = useLeaderboardCountdown();

  return (
    <section className="relative z-20 py-16 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        {error && (
          <div className="mb-4 text-sm text-yellow-300 opacity-80">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-white/70">Loading leaderboard…</div>
        ) : (
          <>
            {/* Title stays up top */}
            <header className="mb-6 flex items-center justify-center gap-4">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white" style={{ textShadow: "0 0 45px rgba(99,102,241,0.5)" }}>
                Current Leaderboard
              </h1>
              <button
                onClick={() => setShowHistory(true)}
                className="text-xs px-3 py-1 rounded-full border text-white/80 hover:text-white"
                style={{ borderColor: "rgba(99,102,241,0.6)" }}
              >
                History
              </button>
            </header>

            {/* Podium (1 / 2 / 3 on mobile, 2 / 1 / 3 on desktop) */}
            <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-4">
              {top3[0] && (
                <PodiumCard
                  placement={1}
                  item={top3[0]}
                  className="md:order-2"
                  height="h-[260px]"
                  tint="rgba(99,102,241,0.22)"
                  edgeColor={BRAND_PRIMARY}
                  badge={<Crown size={18} color={BRAND_PRIMARY} />}
                  highlight
                />
              )}
              {top3[1] && (
                <PodiumCard
                  placement={2}
                  item={top3[1]}
                  className="md:order-1"
                  height="h-[220px]"
                  tint="rgba(0, 255, 255, 0.10)"
                  edgeColor="#22d3ee"
                  badge={<MedalRibbon n={2} color="#22d3ee" />}
                  highlight={false}
                />
              )}
              {top3[2] && (
                <PodiumCard
                  placement={3}
                  item={top3[2]}
                  className="md:order-3"
                  height="h-[200px]"
                  tint="rgba(250,204,21,0.10)"
                  edgeColor="#facc15"
                  badge={<MedalRibbon n={3} color="#facc15" />}
                  highlight={false}
                />
              )}
            </div>

            {/* Countdown UNDERNEATH the podiums (boxy, consistent) */}
            <div className="mb-8">
              <div className="flex items-center justify-center gap-4">
                {[
                  { label: "Days", value: days },
                  { label: "Hours", value: hours },
                  { label: "Minutes", value: minutes },
                  { label: "Seconds", value: seconds },
                ].map((b) => (
                  <div key={b.label} className="flex flex-col items-center">
                    <div className="rounded-xl px-4 py-3 border border-white/10 bg-white/[0.03] min-w-[72px] text-center">
                      <div className="text-2xl font-black tracking-tight text-white">
                        {String(b.value).padStart(2, "0")}
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-gray-400">
                      {b.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center text-gray-400 text-sm">
                Resets every 14 days at 00:00 UTC
              </div>
            </div>

            {/* Ranks 4–15 (now includes Prize column to match actual design) */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="grid grid-cols-12 text-[11px] uppercase tracking-wider text-gray-400 px-3 py-2">
                <div className="col-span-2">Rank</div>
                <div className="col-span-5">Player</div>
                <div className="col-span-3">Wagered</div>
                <div className="col-span-2 text-right">Prize</div>
              </div>
              <div className="divide-y divide-white/5">
                {rest.map((r) => (
                  <div key={r.rank} className="grid grid-cols-12 items-center px-3 py-3 hover:bg-white/[0.02]">
                    <div className="col-span-2 font-black text-white">#{r.rank}</div>
                    <div className="col-span-5">{maskName(r.name)}</div>
                    <div className="col-span-3 text-gray-300">{formatMoney(r.wagered)}</div>
                    <div className="col-span-2 text-right font-semibold" style={{ color: BRAND_SECONDARY }}>
                      {formatMoney(r.prize)}
                    </div>
                  </div>
                ))}
                {rest.length === 0 && (
                  <div className="px-3 py-6 text-sm text-gray-400">No more players yet.</div>
                )}
              </div>
            </div>

            {showHistory && (
              <HistoryModal
                rows={historyData}
                range={historyRange}
                loading={historyLoading}
                onClose={() => setShowHistory(false)}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}



function PodiumCard({ placement, item, className, height, tint, edgeColor, badge, highlight }) {
  const edge = { boxShadow: `inset 0 0 0 1px ${edgeColor}22, 0 30px 80px -40px ${edgeColor}66` };
  const ribbon = placement === 1 ? "bg-[rgba(99,102,241,0.18)]" : placement === 2 ? "bg-cyan-400/10" : "bg-rose-400/10";
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ y: 30, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: placement * 0.05 }}
    >
      <div
        className={`rounded-3xl ${height} p-5 md:p-6 flex flex-col justify-end`}
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.2)), radial-gradient(120% 160% at 50% 0%, ${tint}, transparent 60%)`,
          border: `1px solid ${edgeColor}40`,
          transform: "perspective(800px) rotateX(4deg)",
          ...edge,
        }}
      >
        <div className={`absolute -top-3 left-5 px-3 py-1 rounded-xl text-xs tracking-wide ${ribbon}`} style={{ border: `1px solid ${edgeColor}55` }}>
          {placement === 1 ? "Champion" : placement === 2 ? "Runner-up" : "Third"}
        </div>
        <div className="absolute -top-5 right-5 bg-black/70 rounded-2xl p-2 border border-white/10" style={{ boxShadow: `0 10px 40px -20px ${edgeColor}88` }}>
          {badge}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-5xl font-black" style={{ color: highlight ? BRAND_PRIMARY : "white" }}>#{item.rank}</div>
            <div className="text-lg font-semibold">{maskName(item.name)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Wagered</div>
            <div className="text-lg font-extrabold">{formatMoney(item.wagered)}</div>
            <div className="text-xs text-gray-400 mt-1">Prize</div>
            <div className="text-base font-bold" style={{ color: BRAND_SECONDARY }}>{formatMoney(item.prize)}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MedalRibbon({ n, color }) {
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return (
    <div className="flex items-center gap-1">
      <Medal size={16} color={color} />
      <span className="text-xs" style={{ color }}>
        {n}
        {suffix}
      </span>
    </div>
  );
}

function HistoryTable({ rows, range, loading }) {
  if (loading) {
    return <div className="text-white/70 mb-8">Loading history…</div>;
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-black/80 overflow-hidden mb-8">
      <div className="grid grid-cols-12 text-[11px] uppercase tracking-wider text-gray-400 px-3 py-2">
        <div className="col-span-2">Rank</div>
        <div className="col-span-5">Player</div>
        <div className="col-span-3">Wagered</div>
        <div className="col-span-2 text-right">Prize</div>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((r) => (
          <div key={r.rank} className="grid grid-cols-12 items-center px-3 py-3 hover:bg-white/[0.02]">
            <div className="col-span-2 font-black text-white">#{r.rank}</div>
            <div className="col-span-5">{maskName(r.name)}</div>
            <div className="col-span-3 text-gray-300">{formatMoney(r.wagered)}</div>
            <div className="col-span-2 text-right font-semibold" style={{ color: BRAND_SECONDARY }}>
              {formatMoney(r.prize)}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-3 py-6 text-sm text-gray-400">No history available.</div>
        )}
      </div>
      {range.start && range.end && (
        <div className="px-3 py-2 text-center text-xs text-gray-400">
          {formatPeriod(range.start, range.end)}
        </div>
      )}
    </div>
  );
}

function HistoryModal({ rows, range, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-2xl">
        <button
          onClick={onClose}
          className="absolute z-10 top-2 right-2 text-sm px-2 py-1 rounded bg-black/80 border border-white/20"
        >
          Close
        </button>
        <HistoryTable rows={rows} range={range} loading={loading} />
      </div>
    </div>
  );
}

function formatPeriod(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
}


// Obfuscate a username so only first two characters are visible
function maskName(name) {
  if (!name) return "";
  const visible = name.slice(0, 2);
  const hidden = "*".repeat(Math.max(name.length - 2, 0));
  return visible + hidden;
}

function formatMoney(n) {
  const isIntPrize = Number.isInteger(n);
  const value = isIntPrize ? n : Math.round(n * 100) / 100;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: isIntPrize ? 0 : 2, maximumFractionDigits: 2 })}`;
}

// =========================================================
// Reusable bits from your original files
// =========================================================
function LeaderboardPreview() {
  // prize ladder for the preview (top 5 only)
  const prizeByRank = useMemo(
    () => ({ 1: 175, 2: 125, 3: 100, 4: 80, 5: 65 }),
    []
  );

  // fallback in case the API is unreachable
  const FALLBACK = useMemo(
    () => [
      { rank: 1, user: "BossBaby", points: 128430, prize: prizeByRank[1] },
      { rank: 2, user: "BossBaby", points: 117210, prize: prizeByRank[2] },
      { rank: 3, user: "BossBaby", points: 109980, prize: prizeByRank[3] },
      { rank: 4, user: "BossBaby", points: 89340, prize: prizeByRank[4] },
      { rank: 5, user: "BossBaby", points: 81120, prize: prizeByRank[5] },
    ],
    [prizeByRank]
  );

  const [rows, setRows] = useState(FALLBACK);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("https://bankbros.vercel.app/api/leaderboard/top", {
          headers: { Accept: "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const items = (j.items ?? [])
          .slice(0, 5)
          .map((x) => ({
            rank: x.rank,
            user: x.username,
            points: Number(x.wagered || 0),
            prize: prizeByRank[x.rank] ?? 0,
          }));
        if (!alive) return;
        setRows(items.length ? items : FALLBACK);
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setRows(FALLBACK);
      }
    })();
    return () => {
      alive = false;
    };
  }, [FALLBACK, prizeByRank]);

  return (
    <div className="p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-extrabold text-white">Current Leaderboard</div>
        <a href="#/leaderboards" className="text-sm" style={{ color: BRAND_SECONDARY }}>
          View all
        </a>
      </div>
      <div className="grid grid-cols-12 text-xs uppercase tracking-wider text-gray-400 px-3 py-2">
        <div className="col-span-2">Rank</div>
        <div className="col-span-5">Player</div>
        <div className="col-span-3">Wagered</div>
        <div className="col-span-2 text-right">Prize</div>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((r) => (
          <div key={r.rank} className="grid grid-cols-12 items-center px-3 py-3">
            <div className="col-span-2 font-black" style={{ color: r.rank <= 3 ? BRAND_PRIMARY : "white" }}>#{r.rank}</div>
            <div className="col-span-5">{maskName(r.user)}</div>
            <div className="col-span-3 text-gray-300">{r.points.toLocaleString()}</div>
            <div className="col-span-2 text-right font-semibold">{formatMoney(r.prize)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Accordion({ question, answer, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.04]"
      style={{ boxShadow: "0 25px 80px -45px rgba(99,102,241,0.35)" }}
    >
      <button
        className="w-full text-left px-5 py-4 font-semibold flex items-center justify-between text-white"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{question}</span>
        <ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} size={18} color={BRAND_PRIMARY} />
      </button>
      <div className={`grid transition-all duration-300 px-5 ${open ? "grid-rows-[1fr] py-0 pb-5" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden text-gray-300 text-sm">{answer}</div>
      </div>
    </div>
  );
}

const faqItems = [
  { q: "How do I climb the Leaderboards?", a: "Sign up with code BANKBROS and you will automatically be entered into the Leaderboards. Each $ wagered gets added to the Leaderboard." },
  { q: "When are prizes paid?", a: "Payouts for Leaderboards occur within 72 hours after the leaderboard locks. Instant drops and weekly promos are credited as advertised." },
  { q: "Is there an entry fee?", a: "No entry fees. Participation is free — just play on partnered sites via BankBros to track your stats." },
  { q: "How do you prevent abuse?", a: "We flag suspicious wager patterns, collusion, and risk-free loops. Violations may lead to point removal or disqualification." },
];

function RulesPage() {
  const cardStyle = {
    border: "1px solid rgba(148,163,184,0.18)",
    boxShadow: "0 30px 90px -45px rgba(99,102,241,0.35)",
    background: "linear-gradient(160deg, rgba(99,102,241,0.15), rgba(15,23,42,0.85))",
  };
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-8">
      <h1 className="text-4xl font-extrabold mb-8 text-white" style={{ textShadow: "0 0 45px rgba(99,102,241,0.45)" }}>Rules</h1>
      <div className="space-y-8">
        <div style={cardStyle} className="p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4">Wagering Rules</h2>
          <p className="mb-2">Only Slots and House Games are eligible.</p>
          <p>🚫 Dice, live games, and sports bets do not count.</p>
        </div>
        <div style={cardStyle} className="p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4">Wager contribution by RTP</h2>
          <ul className="space-y-2">
            <li>🎰 RTP ≤ 97% → 100% of wager counts</li>
            <li>🎯 RTP &gt; 97% → 50% of wager counts</li>
            <li>💎 RTP ≥ 98% → 10% of wager counts</li>
          </ul>
        </div>
        <div style={cardStyle} className="p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4">Important Notes</h2>
          <ul className="space-y-2">
            <li>📅 You must be wagering under my referral to qualify.</li>
            <li>Prizes are paid directly to your Roobet account.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
