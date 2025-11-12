import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles, Trophy, ShieldCheck, MessageCircle, Play, ExternalLink, Timer, Users } from "lucide-react";
import useLeaderboardCountdown from "./useLeaderboardCountdown";
import dejenLogo from "./assets/dejen.svg";
import csgoldLogo from "./assets/csgold.svg";

// —— Brand Tokens ——
const BRAND_PRIMARY = "#f97316"; // deep orange
const BRAND_SECONDARY = "#92400e"; // rich brown accent
const BRAND_GLOW = "rgba(250,204,21,0.65)";
const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND_PRIMARY}, ${BRAND_SECONDARY})`;

const PODIUM_GOLD = {
  accent: "#ffd166",
  edge: "#f9d66b",
  tint: "rgba(255, 209, 102, 0.35)",
  glow: "rgba(255, 209, 102, 0.65)",
};

const PODIUM_SILVER = {
  accent: "#d1d5db",
  edge: "#cbd5f5",
  tint: "rgba(209, 213, 219, 0.28)",
  glow: "rgba(209, 213, 219, 0.5)",
};

const PODIUM_BRONZE = {
  accent: "#cd7f32",
  edge: "#c46a28",
  tint: "rgba(205, 127, 50, 0.28)",
  glow: "rgba(205, 127, 50, 0.55)",
};

function coerceNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.,-]/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === "bigint") return Number(value);
  return fallback;
}

function extractRowArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.leaderboard)) return payload.leaderboard;
  if (Array.isArray(payload.entries)) return payload.entries;
  return [];
}

function normalizeLeaderboardRows(payload, prizeLadder = {}) {
  const rows = extractRowArray(payload);
  const normalized = rows.map((row, index) => {
    const rawRank = coerceNumber(row?.rank ?? row?.position ?? row?.place ?? row?.order ?? row?.index, Number.NaN);
    const rank = Number.isFinite(rawRank) && rawRank > 0 ? rawRank : index + 1;
    const name =
      row?.name ??
      row?.username ??
      row?.user ??
      row?.player ??
      row?.displayName ??
      row?.alias ??
      `Player ${rank}`;
    const wageredSource =
      row?.wagered ??
      row?.amount ??
      row?.total ??
      row?.points ??
      row?.value ??
      row?.volume ??
      0;
    const wagered = coerceNumber(wageredSource, 0);
    const prizeSource =
      (typeof row?.prize === "object" ? row?.prize?.amount ?? row?.prize?.value ?? row?.prize?.total : row?.prize) ??
      row?.reward ??
      row?.payout ??
      row?.prizeAmount ??
      0;
    const basePrize = coerceNumber(prizeSource, 0);
    const mappedPrize = prizeLadder?.[rank];
    return {
      rank,
      name,
      wagered,
      prize: mappedPrize !== undefined ? mappedPrize : basePrize,
    };
  });
  normalized.sort((a, b) => a.rank - b.rank);
  return normalized;
}

function applyPrizeLadder(rows, prizeLadder) {
  return normalizeLeaderboardRows(rows, prizeLadder);
}

const DEJEN_PRIZE_LADDER = Object.freeze({
  1: 1050,
  2: 750,
  3: 500,
  4: 275,
  5: 150,
  6: 100,
  7: 75,
  8: 50,
  9: 30,
  10: 20,
});

const DEJEN_FALLBACK = Object.freeze(
  normalizeLeaderboardRows(
    Array.from({ length: 10 }, (_, index) => ({
      rank: index + 1,
      name: "—",
      wagered: 0,
    })),
    DEJEN_PRIZE_LADDER
  )
);

const CSGOLD_PRIZE_LADDER = Object.freeze({
  1: 105,
  2: 65,
  3: 40,
  4: 25,
  5: 15,
  6: 0,
  7: 0,
  8: 0,
  9: 0,
  10: 0,
});

const CSGOLD_FALLBACK = Object.freeze(
  normalizeLeaderboardRows(
    [
      { rank: 1, name: "BossBaby", wagered: 4210.12 },
      { rank: 2, name: "BossBaby", wagered: 3785.55 },
      { rank: 3, name: "BossBaby", wagered: 3320.4 },
      { rank: 4, name: "BossBaby", wagered: 2888.22 },
      { rank: 5, name: "BossBaby", wagered: 2510.75 },
      { rank: 6, name: "BossBaby", wagered: 2304.65 },
      { rank: 7, name: "BossBaby", wagered: 2100.33 },
      { rank: 8, name: "BossBaby", wagered: 1995.9 },
      { rank: 9, name: "BossBaby", wagered: 1850.11 },
      { rank: 10, name: "BossBaby", wagered: 1705.45 },
    ],
    CSGOLD_PRIZE_LADDER
  )
);

const LEADERBOARD_CONFIGS = [
  {
    id: "dejen",
    name: "Dejen",
    buttonLabel: "Dejen Leaderboard",
    logo: dejenLogo,
    topUrl: "/data/dejen-leaderboard.json",
    historyUrl: null,
    fallback: DEJEN_FALLBACK,
    prizes: DEJEN_PRIZE_LADDER,
    messages: {
      empty: "No live Dejen data yet – showing sample data.",
      error: "Couldn’t load Dejen data – showing sample data.",
    },
  },
  {
    id: "csgold",
    name: "CsGold",
    buttonLabel: "CsGold Leaderboard",
    logo: csgoldLogo,
    topUrl: "/data/csgold-leaderboard.json",
    historyUrl: null,
    fallback: CSGOLD_FALLBACK,
    prizes: CSGOLD_PRIZE_LADDER,
    messages: {
      empty: "No live CsGold data yet – showing sample data.",
      error: "Couldn’t load CsGold data – showing sample data.",
    },
  },
];

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
  if (path.startsWith("/leaderboards")) Page = LeaderboardsPage;

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
      className="relative min-h-screen text-white overflow-hidden selection:bg-white/10 selection:text-white"
      style={{ backgroundColor: "#050302" }}
    >
      {/* BACKGROUND LAYERS */}
      <Noise />
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: `radial-gradient(circle at 18% 18%, ${BRAND_PRIMARY}26, transparent 55%), radial-gradient(circle at 80% 12%, ${BRAND_SECONDARY}22, transparent 60%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: "linear-gradient(110deg, rgba(255,255,255,0.05), transparent 45%, rgba(68,33,12,0.82))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black" />
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
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.05] px-5 py-4 backdrop-blur-xl supports-[backdrop-filter]:bg-white/[0.05]" style={{ boxShadow: `0 25px 80px -40px ${BRAND_GLOW}` }}>
          <div className="flex items-center gap-3">
            <div
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl"
              style={{ backgroundImage: BRAND_GRADIENT, boxShadow: `0 15px 35px -15px ${BRAND_GLOW}` }}
            >
              <div className="absolute inset-0 flex items-center justify-center font-black text-lg tracking-tight text-white">
                BB
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight" style={{ color: BRAND_PRIMARY }}>
                BankBros
              </div>
            </div>
          </div>

          <ul className="hidden md:flex items-center gap-1 text-gray-200">
            <li>{link("/", "Home")}</li>
            <li>{link("/leaderboards", "Leaderboards")}</li>
          </ul>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://discord.gg/Web23tM2gB"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/80 hover:text-white hover:border-white/40"
            >
              <DiscordIcon size={18} />
              Join Discord
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
            </div>
            <div className="mt-4 flex items-center gap-3 text-white/80">
              <a
                href="https://discord.gg/Web23tM2gB"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
              >
                <DiscordIcon size={18} />
                Join Discord
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
    <footer className="relative z-20 mt-20 border-t border-amber-500/10 bg-black/70 backdrop-blur">
      <div className="absolute inset-x-0 -top-20 h-20" aria-hidden>
        <div
          className="mx-auto h-full w-full max-w-5xl rounded-full blur-3xl"
          style={{ backgroundImage: BRAND_GRADIENT, opacity: 0.3 }}
        />
      </div>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr,1fr,1fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3">
              <div
                className="h-11 w-11 rounded-2xl"
                style={{ backgroundImage: BRAND_GRADIENT, boxShadow: `0 18px 40px -18px ${BRAND_GLOW}` }}
              />
              <div>
                <div className="text-xl font-bold tracking-tight" style={{ color: BRAND_PRIMARY }}>
                  BankBros Rewards
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-300/80">
              Play responsibly. BankBros does not assume responsibility for any losses incurred while wagering.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://discord.gg/Web23tM2gB"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/90 hover:bg-white/20"
              >
                <DiscordIcon size={18} />
                Join the Lounge
              </a>
              <a
                href="https://kick.com/bankroll-bros"
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
            ]}
          />
          <FooterCol
            title="Connect"
            links={[
              { label: "Discord", href: "https://discord.gg/Web23tM2gB" },
              { label: "Kick", href: "https://kick.com/bankroll-bros" },
              { label: "X", href: "https://twitter.com/bankbros" },
            ]}
          />
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500/80 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} BankBros Rewards. All rights reserved.</div>
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

        <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 text-center">
          <div className="w-full space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-amber-100/80"
            >
              <Sparkles size={14} style={{ color: BRAND_PRIMARY }} /> Leaderboard Live Now!
            </motion.div>

            <motion.h1
              className="text-center text-4xl font-black leading-[1.05] text-white sm:text-5xl md:text-6xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
            >
              BankBros Rewards
            </motion.h1>

            <motion.p
              className="mx-auto max-w-2xl text-base text-slate-300/90 sm:text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
            >
             Earn your spot on the Leaderboards, unlock exclusive Rewards, and enjoy Seasonal drops tailored for the BankBros Community.
            </motion.p>

            <motion.div
              className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7 }}
            >
              {[
                { label: "Active Community", value: "200+" },
                { label: "Weekly Rewards", value: "$500" },
                { label: "Daily Stream", value: "KICK.COM" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-3xl border border-amber-500/20 bg-white/[0.05] px-4 py-5 text-center shadow-[0_25px_80px_-45px_rgba(217,119,6,0.55)]"
                >
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{s.label}</div>
                  <div className="mt-2 text-2xl font-extrabold" style={{ color: BRAND_PRIMARY }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            >
              <a
                href="#/leaderboards"
                className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-base font-semibold text-white"
                style={{ backgroundImage: BRAND_GRADIENT, boxShadow: `0 30px 90px -40px ${BRAND_GLOW}` }}
              >
                <Trophy size={18} /> View Live Leaderboard
              </a>
              <a
                href="https://discord.gg/Web23tM2gB"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-500/30 px-8 py-3 text-base font-semibold text-white/80 transition hover:text-white hover:border-amber-400"
              >
                <MessageCircle size={18} /> Join the Lounge
              </a>
            </motion.div>

            <motion.div
              className="flex flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-[0.3em] text-slate-400"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2">
                <ShieldCheck size={14} style={{ color: BRAND_PRIMARY }} /> Fast Payouts
              </div>
              <div className="inline-flex items-center gap-2">
                <Timer size={14} style={{ color: BRAND_PRIMARY }} /> Reset every 7 days
              </div>
              <div className="inline-flex items-center gap-2">
                <Users size={14} style={{ color: BRAND_PRIMARY }} /> Community-first
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="relative z-20 px-6 pb-24">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-white/10 bg-white/[0.04] px-8 py-14 backdrop-blur-xl">
          <div className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-black text-white sm:text-4xl">
                Leaderboards
              </h2>
              <p className="mt-4 text-base text-slate-300/90">
                Climb the ranks by wagering on our partnered casinos using the code
                <span className="text-amber-400 font-semibold"> “BankBros”</span>.
                Every tracked bet pushes you up the leaderboard for a shot at cash,
                merch, and exclusive drops. Compete live, rise fast, and lock in your spot among the BankBros elite.
              </p>
      
              <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
                <a
                  href="#/leaderboards"
                  className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 px-4 py-2 text-white/80 transition hover:text-white hover:border-amber-400"
                >
                  <ExternalLink size={14} /> Open Leaderboard
                </a>
              </div>
            </div>
      
            <div className="rounded-[28px] border border-amber-500/15 bg-black/60 p-6 shadow-[0_30px_110px_-60px_rgba(217,119,6,0.7)]">
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

      {/* FAQ */}
      <section id="faq" className="relative z-20 px-6 pb-24">
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

function LeaderboardsPage() {
  const leaderboardConfigs = LEADERBOARD_CONFIGS;
  const [activeLeaderboard, setActiveLeaderboard] = React.useState(leaderboardConfigs[0]?.id ?? "");
  const [leaderboardState, setLeaderboardState] = React.useState(() => {
    const initial = {};
    leaderboardConfigs.forEach((cfg) => {
      initial[cfg.id] = {
        rows: applyPrizeLadder(cfg.fallback, cfg.prizes),
        loading: true,
        error: "",
        historyRows: [],
        historyRange: { start: "", end: "" },
        historyLoading: Boolean(cfg.historyUrl),
      };
    });
    return initial;
  });
  const [showHistory, setShowHistory] = React.useState(false);

  const updateLeaderboardSlice = React.useCallback((id, patch) => {
    setLeaderboardState((prev) => {
      const next = { ...prev };
      const current = next[id] ?? {
        rows: [],
        loading: false,
        error: "",
        historyRows: [],
        historyRange: { start: "", end: "" },
        historyLoading: false,
      };
      next[id] = { ...current, ...patch };
      return next;
    });
  }, []);

  const forceMock = typeof window !== "undefined" && window.location.hash.includes("mock");

  React.useEffect(() => {
    let alive = true;

    if (forceMock) {
      setLeaderboardState((prev) => {
        const next = { ...prev };
        leaderboardConfigs.forEach((cfg) => {
          const current = next[cfg.id] ?? {
            rows: [],
            loading: false,
            error: "",
            historyRows: [],
            historyRange: { start: "", end: "" },
            historyLoading: false,
          };
          next[cfg.id] = {
            ...current,
            rows: applyPrizeLadder(cfg.fallback, cfg.prizes),
            loading: false,
            error: "",
            historyLoading: false,
          };
        });
        return next;
      });
      return () => {
        alive = false;
      };
    }

    leaderboardConfigs.forEach((cfg) => {
      const fallbackRows = applyPrizeLadder(cfg.fallback, cfg.prizes);
      console.log(`[${cfg.name}] Leaderboard API_URL:`, cfg.topUrl);
      updateLeaderboardSlice(cfg.id, {
        loading: true,
        error: "",
        historyLoading: Boolean(cfg.historyUrl),
      });

      (async () => {
        try {
          const response = await fetch(cfg.topUrl, { headers: { Accept: "application/json" } });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = await response.json();
          const dynamicPrizeMap = Array.isArray(payload?.prizes)
            ? Object.fromEntries(
                payload.prizes
                  .map((prize) => [
                    coerceNumber(prize?.rank, Number.NaN),
                    coerceNumber(prize?.amount ?? prize?.value ?? prize?.total ?? prize?.prize, Number.NaN),
                  ])
                  .filter(([rank, amount]) => Number.isFinite(rank) && rank > 0 && Number.isFinite(amount) && amount >= 0)
              )
            : undefined;
          const prizeMap = dynamicPrizeMap ? { ...cfg.prizes, ...dynamicPrizeMap } : cfg.prizes;
          const normalized = normalizeLeaderboardRows(payload, prizeMap);
          if (!alive) return;
          if (normalized.length) {
            updateLeaderboardSlice(cfg.id, { rows: normalized, loading: false, error: "" });
          } else {
            updateLeaderboardSlice(cfg.id, {
              rows: fallbackRows,
              loading: false,
              error: cfg.messages?.empty ?? "No live data yet – showing sample data.",
            });
          }
        } catch (error) {
          if (!alive) return;
          console.error(error);
          updateLeaderboardSlice(cfg.id, {
            rows: fallbackRows,
            loading: false,
            error: cfg.messages?.error ?? "Couldn’t load live data – showing sample data.",
          });
        }
      })();

      if (!cfg.historyUrl) {
        updateLeaderboardSlice(cfg.id, {
          historyRows: [],
          historyRange: { start: "", end: "" },
          historyLoading: false,
        });
        return;
      }

      (async () => {
        try {
          const response = await fetch(cfg.historyUrl, { headers: { Accept: "application/json" } });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = await response.json();
          const normalized = normalizeLeaderboardRows(payload, cfg.prizes);
          if (!alive) return;
          updateLeaderboardSlice(cfg.id, {
            historyRows: normalized,
            historyRange: { start: payload.period_start ?? "", end: payload.period_end ?? "" },
            historyLoading: false,
          });
        } catch (error) {
          if (!alive) return;
          console.error(error);
          updateLeaderboardSlice(cfg.id, {
            historyRows: [],
            historyRange: { start: "", end: "" },
            historyLoading: false,
          });
        }
      })();
    });

    return () => {
      alive = false;
    };
  }, [forceMock, leaderboardConfigs, updateLeaderboardSlice]);

  React.useEffect(() => {
    if (!activeLeaderboard && leaderboardConfigs[0]) {
      setActiveLeaderboard(leaderboardConfigs[0].id);
    }
  }, [activeLeaderboard, leaderboardConfigs]);

  React.useEffect(() => {
    setShowHistory(false);
  }, [activeLeaderboard]);

  const activeConfig =
    leaderboardConfigs.find((cfg) => cfg.id === activeLeaderboard) ?? leaderboardConfigs[0];

  const activeSlice = activeConfig ? leaderboardState[activeConfig.id] : undefined;
  const activeRows = activeSlice?.rows ?? [];
  const isLoading = activeSlice?.loading ?? false;
  const activeError = activeSlice?.error ?? "";
  const historyRows = activeSlice?.historyRows ?? [];
  const historyRange = activeSlice?.historyRange ?? { start: "", end: "" };
  const historyLoading = activeSlice?.historyLoading ?? false;

  const top3 = activeRows.slice(0, 3); // [1st, 2nd, 3rd]
  const rest = activeRows.slice(3, 10); // 4..10
  const { days, hours, minutes, seconds } = useLeaderboardCountdown();

  return (
    <section className="relative z-20 py-16 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        {activeError && (
          <div className="mb-4 text-sm text-yellow-300 opacity-80">
            {activeError}
          </div>
        )}

        {isLoading ? (
          <div className="text-white/70">Loading leaderboard…</div>
        ) : (
          <>
            {/* Title stays up top */}
            <header className="mb-6 flex flex-col items-center gap-3 text-center">
              <div className="flex flex-wrap items-center justify-center gap-4">
                <h1 className="text-3xl md:text-4xl font-extrabold text-white" style={{ textShadow: `0 0 45px ${BRAND_PRIMARY}55` }}>
                  Current Leaderboard
                </h1>
              </div>
              {activeConfig && (
                <span className="text-xs uppercase tracking-[0.4em] text-white/60">
                  {activeConfig.name}
                </span>
              )}
            </header>

            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {leaderboardConfigs.map((cfg) => {
                  const isActive = cfg.id === (activeConfig?.id ?? activeLeaderboard);
                  return (
                    <motion.button
  key={cfg.id}
  type="button"
  onClick={() => setActiveLeaderboard(cfg.id)}
  aria-pressed={isActive}
  aria-label={cfg.buttonLabel ?? cfg.name}
  title={cfg.buttonLabel ?? cfg.name}
  className={`relative flex items-center rounded-full border transition
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    focus-visible:ring-offset-black focus-visible:ring-white/80
    ${isActive
      ? "bg-white/15 border-white/40 text-white shadow-[0_0_30px_rgba(249,115,22,0.45)]"
      : "bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:border-white/30"
    }
    px-3 py-3  /* was px-2 py-2 */
  `}
  whileTap={{ scale: 0.97 }}
>
  <img
    src={cfg.logo}
    alt=""
    aria-hidden="true"
    className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-contain shadow-inner shadow-black/40" 
    /* was h-9 w-9 */
  />
  <span className="sr-only">{cfg.buttonLabel ?? cfg.name}</span>
</motion.button>



                  );
                })}
              </div>
            </div>

            {/* Podium (1 / 2 / 3 on mobile, 2 / 1 / 3 on desktop) */}
            <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-4">
              {top3[0] && (
                <PodiumCard
                  item={top3[0]}
                  className="md:order-2"
                  height="min-h-[260px]"
                  tint={PODIUM_GOLD.tint}
                  edgeColor={PODIUM_GOLD.edge}
                  accentColor={PODIUM_GOLD.accent}
                  glowColor={PODIUM_GOLD.glow}
                />
              )}
              {top3[1] && (
                <PodiumCard
                  item={top3[1]}
                  className="md:order-1"
                  height="min-h-[220px]"
                  tint={PODIUM_SILVER.tint}
                  edgeColor={PODIUM_SILVER.edge}
                  accentColor={PODIUM_SILVER.accent}
                  glowColor={PODIUM_SILVER.glow}
                />
              )}
              {top3[2] && (
                <PodiumCard
                  item={top3[2]}
                  className="md:order-3"
                  height="min-h-[200px]"
                  tint={PODIUM_BRONZE.tint}
                  edgeColor={PODIUM_BRONZE.edge}
                  accentColor={PODIUM_BRONZE.accent}
                  glowColor={PODIUM_BRONZE.glow}
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
                  <TimeTile key={b.label} label={b.label} value={b.value} />
                ))}
              </div>
              <div className="mt-3 text-center text-gray-400 text-sm">
                Resets at 00:00 UTC
              </div>
            </div>

            {/* Ranks 4–10 (now includes Prize column to match actual design) */}
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
                    <div className="col-span-2 text-right font-semibold" style={{ color: BRAND_PRIMARY }}>
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
                rows={historyRows}
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



function PodiumCard({ item, className, height, tint, edgeColor, accentColor, glowColor }) {
  const accent = accentColor || edgeColor || BRAND_PRIMARY;
  const delay = item && typeof item.rank === "number" ? Math.max(0, (item.rank - 1) * 0.05) : 0;
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ y: 30, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      <div
        className={`rounded-3xl ${height} p-5 md:p-6 flex flex-col justify-between border`}
        style={{
          borderColor: `${(edgeColor || accent)}55`,
          background: `linear-gradient(165deg, ${tint}, rgba(12,9,7,0.92))`,
          boxShadow: `0 25px 80px -45px ${glowColor || `${accent}55`}`,
        }}
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-5xl font-black tracking-tight text-white" style={{ color: accent }}>#{item.rank}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{maskName(item.name)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-xs uppercase tracking-[0.25em]" style={{ color: `${accent}b3` }}>
            <div>
              <div>Wagered</div>
              <div className="mt-2 text-base font-extrabold text-white tracking-tight">
                {formatMoney(item.wagered)}
              </div>
            </div>
            <div className="text-right">
              <div>Prize</div>
              <div className="mt-2 text-base font-semibold" style={{ color: accent }}>
                {formatMoney(item.prize)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TimeTile({ label, value }) {
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-xl px-4 py-3 border border-white/10 bg-white/[0.03] min-w-[72px] text-center">
        <div className="text-2xl font-black tracking-tight text-white">{String(value).padStart(2, "0")}</div>
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-gray-400">{label}</div>
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
            <div className="col-span-2 text-right font-semibold" style={{ color: BRAND_PRIMARY }}>
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
    () => ({ 1: 105000, 2: 75000, 3: 50000, 4: 27500, 5: 15000 }),
    []
  );

  // fallback in case the API is unreachable
  const FALLBACK = useMemo(
    () =>
      DEJEN_FALLBACK.slice(0, 5).map((row) => ({
        rank: row.rank,
        user: row.name,
        points: row.wagered,
        prize: row.prize ?? prizeByRank[row.rank] ?? 0,
      })),
    [prizeByRank]
  );

  const [rows, setRows] = useState(FALLBACK);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/data/dejen-leaderboard.json", {
          headers: { Accept: "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const dynamicPrizeMap = Array.isArray(j?.prizes)
          ? Object.fromEntries(
              j.prizes
                .map((prize) => [
                  coerceNumber(prize?.rank, Number.NaN),
                  coerceNumber(prize?.amount ?? prize?.value ?? prize?.total ?? prize?.prize, Number.NaN),
                ])
                .filter(([rank, amount]) => Number.isFinite(rank) && rank > 0 && Number.isFinite(amount) && amount >= 0)
            )
          : undefined;
        const normalized = normalizeLeaderboardRows(j, dynamicPrizeMap ? { ...prizeByRank, ...dynamicPrizeMap } : prizeByRank)
          .slice(0, 5)
          .map((row) => ({
            rank: row.rank,
            user: row.name,
            points: row.wagered,
            prize: row.prize ?? prizeByRank[row.rank] ?? 0,
          }));
        if (!alive) return;
        setRows(normalized.length ? normalized : FALLBACK);
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
        <a href="#/leaderboards" className="text-sm" style={{ color: BRAND_PRIMARY }}>
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
            <div className="col-span-2 text-right font-semibold" style={{ color: BRAND_PRIMARY }}>
              {formatMoney(r.prize)}
            </div>
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
      style={{ boxShadow: `0 25px 80px -45px ${BRAND_PRIMARY}33` }}
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
  { q: "How do I climb the Leaderboards?", a: "Sign up with code BankBros and you will automatically be entered into the Leaderboards. Each $ wagered gets added to the Leaderboard." },
  { q: "When are prizes paid?", a: "Payouts for Leaderboards occur within 72 hours after the leaderboard locks." },
  { q: "Is there an entry fee?", a: "No entry fees. Participation is free, just play on partnered sites via BankBros to track your stats." },
  { q: "How do you prevent abuse?", a: "We flag suspicious wager patterns, collusion, and risk-free loops. Violations may lead to point removal or disqualification." },
];
