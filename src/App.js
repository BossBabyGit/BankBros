import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles, Gift, Trophy, ShieldCheck, Twitter, MessageCircle, Play, Copy, ExternalLink, Crown, Medal, Timer, Users, Instagram } from "lucide-react";
import useLeaderboardCountdown from "./useLeaderboardCountdown";

// —— Brand Tokens ——
const BANKBROS_ORANGE = "#d97706";

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
    <div className="relative min-h-screen text-white overflow-hidden selection:bg-[#d97706]/40 selection:text-white" style={{ backgroundColor: "black" }}>
      {/* BACKGROUND LAYERS */}
      <Noise />
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#030604] to-black" />
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(rgba(217,119,6,0.16) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
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
    <a href={`#${to}`} className="hover:text-white">
      {label}
    </a>
  );
  return (
    <nav className="relative z-30">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between rounded-b-2xl border-b border-white/10 backdrop-blur supports-[backdrop-filter]:bg-black/40" style={{ boxShadow: "0 10px 40px -20px rgba(217,119,6,0.35)" }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `radial-gradient(ellipse at center, ${BANKBROS_ORANGE}, #7c3d0c)`, boxShadow: "0 0 30px rgba(217,119,6,0.6)" }}>BB</div>
          <span className="text-2xl font-extrabold tracking-tight" style={{ color: BANKBROS_ORANGE }}>BankBros</span>
        </div>
        <ul className="hidden md:flex items-center gap-8 text-sm md:text-base text-gray-300">
          <li>{link("/", "Home")}</li>
          <li>{link("/leaderboards", "Leaderboards")}</li>
          <li>{link("/bonuses", "Bonuses")}</li>
          <li>{link("/rules", "Rules")}</li>
        </ul>
        <div className="hidden md:flex items-center gap-4 text-gray-300">
          <a
            href="https://discord.gg/bankbros"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Discord"
            className="hover:text-white"
          >
            <DiscordIcon size={20} />
          </a>
          <a
            href="https://www.instagram.com/bankbros"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hover:text-white"
          >
            <Instagram size={20} />
          </a>
        </div>
        <button aria-label="menu" className="md:hidden border rounded-xl px-3 py-2 text-sm" style={{ borderColor: BANKBROS_ORANGE, color: BANKBROS_ORANGE }} onClick={() => setOpen((v) => !v)}>
          Menu
        </button>
      </div>
      {open && (
        <div className="md:hidden mx-auto max-w-7xl px-6 py-3 grid gap-2 text-gray-200">
          {link("/", "Home")}
          {link("/leaderboards", "Leaderboards")}
          {link("/bonuses", "Bonuses")}
          {link("/rules", "Rules")}
          <div className="flex gap-4 pt-2 text-gray-300">
            <a
              href="https://discord.gg/bankbros"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
              className="hover:text-white"
            >
              <DiscordIcon size={20} />
            </a>
            <a
              href="https://www.instagram.com/bankbros"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hover:text-white"
            >
              <Instagram size={20} />
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="relative z-20 mt-10 border-t bg-black/70 backdrop-blur" style={{ borderColor: "rgba(217,119,6,0.2)" }}>
      <div className="mx-auto max-w-7xl px-6 py-14 grid gap-10 md:grid-cols-4">
        <div>
          <div className="text-2xl font-extrabold" style={{ color: BANKBROS_ORANGE }}>BankBros</div>
          <p className="mt-3 text-sm text-gray-400">Live leaderboards, curated bonuses, and community-driven rewards.</p>
        </div>
        <FooterCol
          title="Pages"
          links={[
            { label: "Home", href: "#/" },
            { label: "Leaderboards", href: "#/leaderboards" },
            { label: "Bonuses", href: "#/bonuses" },
            { label: "Rules", href: "#/rules" },
          ]}
        />
        <FooterCol
          title="Socials"
          links={[
            { label: "Kick", href: "https://kick.com/bankbros" },
            { label: "Discord", href: "https://discord.gg/bankbros" },
            { label: "X", href: "https://twitter.com/bankbros" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { label: "Terms", href: "#" },
            { label: "Privacy", href: "#" },
            { label: "Responsible Gaming", href: "#" },
          ]}
        />
      </div>
      <div className="mx-auto max-w-7xl px-6 pb-10 text-xs text-gray-500">© {new Date().getFullYear()} BankBros — All rights reserved.</div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="font-semibold mb-3" style={{ color: BANKBROS_ORANGE }}>{title}</div>
      <ul className="space-y-2 text-gray-300">
        {links.map((l) => (
          <li key={l.label} className="hover:text-white/90 cursor-pointer">
            <a href={l.href}>{l.label}</a>
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

  const gradientRing = {
    boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 25px 60px -25px rgba(217,119,6,0.2)",
    border: "1px solid rgba(217,119,6,0.25)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.2))",
  };

  return (
    <>
      {/* HERO */}
      <section ref={heroRef} className="relative z-20 h-[92vh] flex items-center justify-center text-center px-6">
        <motion.div style={{ opacity: orbOpacity }} className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
          <div className="h-[62vmin] w-[62vmin] rounded-full blur-2xl" style={{ background: "radial-gradient(circle at center, rgba(217,119,6,0.28), transparent 60%)" }} />
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <motion.h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight" style={{ textShadow: "0 0 25px rgba(217,119,6,0.45)", color: "#fff" }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            Welcome to the <span style={{ color: BANKBROS_ORANGE }}>BankBros Hub</span>
          </motion.h1>

          <motion.p className="mx-auto max-w-2xl text-base md:text-lg text-gray-300/90 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8 }}>
            Premium bonuses, live leaderboards, and a community built around good vibes (and better prizes).
          </motion.p>

          {/* Quick stats */}
          <motion.div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-3 mb-10" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.8 }}>
            {[
              { label: "Community", value: "1.000+" },
              { label: "Prizes Paid", value: "$5.000+" },
              { label: "Partners", value: "1" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-3 md:p-4 text-left" style={gradientRing}>
                <div className="text-xs uppercase tracking-wider text-gray-400">{s.label}</div>
                <div className="text-xl md:text-2xl font-extrabold" style={{ color: BANKBROS_ORANGE }}>{s.value}</div>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
            <a href="#/leaderboards" className="relative group px-8 py-4 text-base md:text-lg rounded-2xl font-semibold inline-flex items-center justify-center" style={{ border: `2px solid ${BANKBROS_ORANGE}`, boxShadow: "0 8px 30px rgba(217,119,6,0.18)" }}>
              <span className="relative z-10" style={{ color: BANKBROS_ORANGE }}><Trophy className="inline mr-2" size={20}/>Leaderboards</span>
              <span className="absolute inset-0 rounded-2xl -z-0 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300" style={{ backgroundColor: "rgba(217,119,6,0.12)" }} />
            </a>
            <a href="#/bonuses" className="relative overflow-hidden px-8 py-4 text-base md:text-lg rounded-2xl font-semibold inline-flex items-center justify-center" style={{ backgroundColor: BANKBROS_ORANGE, color: "#0a0a0a", boxShadow: "0 10px 35px rgba(217,119,6,0.35)" }}>
              <Gift className="mr-2" size={20} /> Bonuses
            </a>
          </motion.div>

          {/* Scroll cue */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 text-sm" style={{ color: BANKBROS_ORANGE }}>
            <div className="relative h-8 w-5 rounded-full border" style={{ borderColor: BANKBROS_ORANGE }}>
              <span className="absolute left-1/2 top-1 -translate-x-1/2 h-2 w-[2px] rounded-full" style={{ backgroundColor: BANKBROS_ORANGE, animation: "scrollDot 1.6s infinite" }} />
            </div>
            <ChevronDown className="animate-bounce" size={20} color={BANKBROS_ORANGE} />
          </div>
        </div>

        <style>{`@keyframes scrollDot {0%{opacity:1; transform:translate(-50%,0)}60%{opacity:0; transform:translate(-50%,10px)}100%{opacity:0}}`}</style>
      </section>

      {/* LEADERBOARD EXPLAINER */}
      <section className="relative z-20 py-24 px-6">
        <div className="mx-auto max-w-7xl grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ color: BANKBROS_ORANGE }}>How Leaderboards Work</h2>
            <p className="text-gray-300 mb-6">Wager on partnered sites, collect points, and climb the ranks. Frequent resets keep races fresh and competitive.</p>
            <ul className="space-y-3 text-gray-200">
              <li><span style={{ color: BANKBROS_ORANGE }}>•</span> Earn points by wagering on <b>Roobet</b></li>
              <li><span style={{ color: BANKBROS_ORANGE }}>•</span> Top ranks receive <b>CASH Prizes</b></li>
              <li><span style={{ color: BANKBROS_ORANGE }}>•</span> Anti-wager abuse & real-time updates</li>
            </ul>
            <div className="mt-8 flex gap-4">
              <a className="px-6 py-3 rounded-xl font-semibold" href="#/rules" style={{ border: `2px solid ${BANKBROS_ORANGE}`, color: BANKBROS_ORANGE }}>View Rules</a>
              <a className="px-6 py-3 rounded-xl font-semibold" href="#/leaderboards" style={{ backgroundColor: BANKBROS_ORANGE, color: "#0a0a0a" }}>Open Leaderboards</a>
            </div>
          </div>
          <div>
            <div className="w-full rounded-2xl overflow-hidden backdrop-blur" style={gradientRing}>
              <LeaderboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL STRIP */}
      <section className="relative z-20 px-6 pb-10">
        <div className="mx-auto max-w-7xl grid sm:grid-cols-3 gap-4">
          <a href="https://kick.com/bankbros" className="rounded-2xl p-4 flex items-center justify-between" style={gradientRing}>
            <div className="flex items-center gap-3"><Play /><span className="font-semibold">Watch Streams</span></div>
            <span style={{ color: BANKBROS_ORANGE }} className="text-sm">Kick</span>
          </a>
          <a href="https://discord.gg/bankbros" className="rounded-2xl p-4 flex items-center justify-between" style={gradientRing}>
            <div className="flex items-center gap-3"><MessageCircle /><span className="font-semibold">Join the Chat</span></div>
            <span style={{ color: BANKBROS_ORANGE }} className="text-sm">Discord</span>
          </a>
          <a href="https://x.com/bankbros" className="rounded-2xl p-4 flex items-center justify-between" style={gradientRing}>
            <div className="flex items-center gap-3"><Twitter /><span className="font-semibold">Follow Updates</span></div>
            <span style={{ color: BANKBROS_ORANGE }} className="text-sm">X</span>
          </a>
        </div>
      </section>

      {/* FAQ / Rules preview */}
      <section id="rules" className="relative z-20 py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <h3 className="text-3xl md:text-4xl font-extrabold mb-8" style={{ color: BANKBROS_ORANGE }}>FAQ & Rules</h3>
          <div className="space-y-3">
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
          Head to Roobet using our tracked link and create your account. When prompted, enter the promo code <b style={{ color: BANKBROS_ORANGE }}>BANKBROS</b> so every $1 you wager counts toward BankBros bonuses and the leaderboard.
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
          <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm" style={{ borderColor: "rgba(217,119,6,0.3)", boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }}>
            <span className="opacity-80">Promo code:</span>
            <code className="font-bold tracking-wider" style={{ color: BANKBROS_ORANGE }}>BANKBROS</code>
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
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3" style={{ color: BANKBROS_ORANGE }}>{s.title}</h2>
                <p className="text-gray-300 mb-5">{s.desc}</p>

                <a href={s.ctaHref} {...(s.external ? { target: "_blank", rel: "noreferrer" } : {})} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold" style={{ backgroundColor: BANKBROS_ORANGE, color: "#0a0a0a" }}>
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
                <div className="w-full aspect-[16/10] rounded-2xl overflow-hidden border backdrop-blur flex items-center justify-center" style={{ borderColor: "rgba(217,119,6,0.25)", borderWidth: 1, boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 25px 60px -25px rgba(217,119,6,0.18)" }}>
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
              <h1 className="text-3xl md:text-4xl font-extrabold" style={{ color: BANKBROS_ORANGE }}>
                Current Leaderboard
              </h1>
              <button
                onClick={() => setShowHistory(true)}
                className="text-xs px-3 py-1 rounded border"
                style={{ borderColor: BANKBROS_ORANGE, color: BANKBROS_ORANGE }}
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
                  tint="rgba(217,119,6,0.12)"
                  edgeColor={BANKBROS_ORANGE}
                  badge={<Crown size={18} color={BANKBROS_ORANGE} />}
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
                    <div className="col-span-2 text-right font-semibold" style={{ color: BANKBROS_ORANGE }}>
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
  const ribbon = placement === 1 ? "bg-[rgba(217,119,6,0.12)]" : placement === 2 ? "bg-cyan-400/10" : "bg-yellow-400/10";
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
            <div className="text-5xl font-black" style={{ color: highlight ? BANKBROS_ORANGE : "white" }}>#{item.rank}</div>
            <div className="text-lg font-semibold">{maskName(item.name)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Wagered</div>
            <div className="text-lg font-extrabold">{formatMoney(item.wagered)}</div>
            <div className="text-xs text-gray-400 mt-1">Prize</div>
            <div className="text-base font-bold" style={{ color: BANKBROS_ORANGE }}>{formatMoney(item.prize)}</div>
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

function TimeTile({ label, value }) {
  return (
    <div className="rounded-xl px-2 py-2 md:px-2 md:py-2 text-center border border-white/10 bg-black/20">
      <div className="text-2xl md:text-3xl font-black" style={{ color: BANKBROS_ORANGE }}>{String(value).padStart(2, "0")}</div>
      <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-1">{label}</div>
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
            <div className="col-span-2 text-right font-semibold" style={{ color: BANKBROS_ORANGE }}>
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

function BadgeCard({ icon, title, desc }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-black/50" style={{ color: BANKBROS_ORANGE, boxShadow: "0 0 20px rgba(217,119,6,0.25)" }}>{icon}</div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-gray-400 text-xs">{desc}</div>
      </div>
    </div>
  );
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
        <div className="text-xl font-extrabold">Current Leaderboard</div>
        <a href="#/leaderboards" className="text-sm" style={{ color: BANKBROS_ORANGE }}>
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
            <div className="col-span-2 font-black" style={{ color: r.rank <= 3 ? BANKBROS_ORANGE : "white" }}>#{r.rank}</div>
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
    <div className="rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 10px 30px -20px rgba(217,119,6,0.18)" }}>
      <button className="w-full text-left px-5 py-4 font-semibold flex items-center justify-between" onClick={() => setOpen((v) => !v)}>
        <span>{question}</span>
        <ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} size={18} color={BANKBROS_ORANGE} />
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
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 10px 30px -20px rgba(217,119,6,0.18)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.2))",
  };
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-8">
      <h1 className="text-4xl font-extrabold mb-8" style={{ color: BANKBROS_ORANGE }}>Rules</h1>
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
