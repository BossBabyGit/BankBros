import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles, Gift, Trophy, ShieldCheck, Twitter, MessageCircle, Play } from "lucide-react";

// —— Brand Tokens ——
const BANKBROS_ORANGE = "#d97706";

export default function BankBros() {
  // ——— Floating particles animation (neon embers) ———
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

  // ——— Parallax shine for cards ———
  const tiltRef = useRef(null);
  useEffect(() => {
    const el = tiltRef.current;
    if (!el) return;
    function onMove(e) {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", `${y * -6}deg`);
      el.style.setProperty("--ry", `${x * 8}deg`);
      el.style.setProperty("--tx", `${x * 6}px`);
      el.style.setProperty("--ty", `${y * 6}px`);
    }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--tx", "0px");
      el.style.setProperty("--ty", "0px");
    });
    return () => {
      el.removeEventListener("mousemove", onMove);
    };
  }, []);

  // ——— Scroll-driven glow for hero orb ———
  const heroRef = useRef(null);
  const scrollObj = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const orbOpacity = useTransform(scrollObj.scrollYProgress || 0, [0, 1], [0.35, 0]);

  // ——— Fake live jackpot counter for vibes ———
  const jackpot = useFakeCounter(642130.42, 2.7, [0.5, 2.2]);

  // ——— Utility: gradient border style ———
  const gradientRing = {
    boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 25px 60px -25px rgba(217,119,6,0.2)",
    border: "1px solid rgba(217,119,6,0.25)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.2))"
  };

  return (
    <div className="relative min-h-screen text-white overflow-hidden selection:bg-[#d97706]/40 selection:text-white" style={{ backgroundColor: "black" }}>
      {/* BACKGROUND LAYERS */}
      <Noise />
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#030604] to-black" />
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "radial-gradient(rgba(217,119,6,0.16) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
      </div>

      {/* PARTICLES */}
      <canvas id="particles" className="fixed top-0 left-0 w-full h-full z-10 pointer-events-none" />

      {/* NAVBAR */}
      <Navbar />

      {/* HERO */}
      <section ref={heroRef} className="relative z-20 h-[92vh] flex items-center justify-center text-center px-6">
        <motion.div style={{ opacity: orbOpacity }} className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
          <div className="h-[62vmin] w-[62vmin] rounded-full blur-2xl" style={{ background: "radial-gradient(circle at center, rgba(217,119,6,0.28), transparent 60%)" }} />
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <motion.h1
            className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight"
            style={{ textShadow: "0 0 25px rgba(217,119,6,0.45)", color: "#fff" }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Welcome to the <span style={{ color: BANKBROS_ORANGE }}>BankBros Hub</span>
          </motion.h1>

          <motion.p
            className="mx-auto max-w-2xl text-base md:text-lg text-gray-300/90 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8 }}
          >
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
            <a href="#bonuses" className="relative overflow-hidden px-8 py-4 text-base md:text-lg rounded-2xl font-semibold inline-flex items-center justify-center" style={{ backgroundColor: BANKBROS_ORANGE, color: "#0a0a0a", boxShadow: "0 10px 35px rgba(217,119,6,0.35)" }}>
              <Gift className="mr-2" size={20} /> Bonuses
            </a>
            <a href="#leaderboards" className="relative group px-8 py-4 text-base md:text-lg rounded-2xl font-semibold inline-flex items-center justify-center" style={{ border: `2px solid ${BANKBROS_ORANGE}`, boxShadow: "0 8px 30px rgba(217,119,6,0.18)" }}>
              <span className="relative z-10" style={{ color: BANKBROS_ORANGE }}><Trophy className="inline mr-2" size={20}/>Leaderboards</span>
              <span className="absolute inset-0 rounded-2xl -z-0 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300" style={{ backgroundColor: "rgba(217,119,6,0.12)" }} />
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
      <section id="leaderboards" className="relative z-20 py-24 px-6">
        <div className="mx-auto max-w-7xl grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ color: BANKBROS_ORANGE }}>How Leaderboards Work</h2>
            <p className="text-gray-300 mb-6">Wager on partnered sites, collect points, and climb the ranks. Monthly resets keep races fresh and competitive.</p>
            <ul className="space-y-3 text-gray-200">
              <li><span style={{ color: BANKBROS_ORANGE }}>•</span> Earn points by wagering on <b>Roobet</b></li>
              <li><span style={{ color: BANKBROS_ORANGE }}>•</span> Top ranks receive <b>CASH Prizes</b></li>
              <li><span style={{ color: BANKBROS_ORANGE }}>•</span> Anti-wager abuse & real-time updates</li>
            </ul>
            <div className="mt-8 flex gap-4">
              <a className="px-6 py-3 rounded-xl font-semibold" href="#rules" style={{ border: `2px solid ${BANKBROS_ORANGE}`, color: BANKBROS_ORANGE }}>View Rules</a>
              <a className="px-6 py-3 rounded-xl font-semibold" href="/leaderboards" style={{ backgroundColor: BANKBROS_ORANGE, color: "#0a0a0a" }}>Open Leaderboards</a>
            </div>
          </div>
          <div>
            <div className="w-full rounded-2xl overflow-hidden backdrop-blur" style={gradientRing}>
              <LeaderboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* BONUSES */}
      <section id="bonuses" className="relative z-20 py-24 px-6">
        <div className="mx-auto max-w-7xl grid md:grid-cols-2 gap-12 items-center">
                    <div className="order-1 md:order-2">
            <div className="w-full rounded-2xl overflow-hidden" style={gradientRing}>
              <BonusCarousel />
            </div>
          </div>
          <div className="order-2 md:order-1">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ color: BANKBROS_ORANGE }}>Roobet Casino Bonuses</h2>
            <p className="text-gray-300 mb-6">Unlock exclusive BankBros viewer deals on Roobet — deposit boosts, free spins, and weekly promos — all synced with our leaderboard points.</p>
            <ul className="space-y-3 text-gray-200">
              <li><span style={{ color: BANKBROS_ORANGE }}>•</span> Verified bonuses, updated often</li>
              <li><span style={{ color: BANKBROS_ORANGE }}>•</span> Clear terms & responsible play</li>
              <li><span style={{ color: BANKBROS_ORANGE }}>•</span> Works with leaderboard scoring</li>
            </ul>
            <div className="mt-8 flex gap-4">
              <a href="/bonuses" className="px-6 py-3 rounded-xl font-semibold" style={{ backgroundColor: BANKBROS_ORANGE, color: "#0a0a0a" }}>Go to Bonuses</a>
              <a href="/bonuses#roobet" className="px-6 py-3 rounded-xl font-semibold" style={{ border: `2px solid ${BANKBROS_ORANGE}`, color: BANKBROS_ORANGE }}>Roobet Details</a>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL STRIP */}
      <section className="relative z-20 px-6 pb-10">
        <div className="mx-auto max-w-7xl grid sm:grid-cols-3 gap-4">
          <a href="#" className="rounded-2xl p-4 flex items-center justify-between" style={gradientRing}>
            <div className="flex items-center gap-3"><Play /><span className="font-semibold">Watch Streams</span></div>
            <span style={{ color: BANKBROS_ORANGE }} className="text-sm">Kick</span>
          </a>
          <a href="#" className="rounded-2xl p-4 flex items-center justify-between" style={gradientRing}>
            <div className="flex items-center gap-3"><MessageCircle /><span className="font-semibold">Join the Chat</span></div>
            <span style={{ color: BANKBROS_ORANGE }} className="text-sm">Discord</span>
          </a>
          <a href="#" className="rounded-2xl p-4 flex items-center justify-between" style={gradientRing}>
            <div className="flex items-center gap-3"><Twitter /><span className="font-semibold">Follow Updates</span></div>
            <span style={{ color: BANKBROS_ORANGE }} className="text-sm">X</span>
          </a>
        </div>
      </section>

      {/* FAQ */}
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

      {/* FOOTER */}
      <footer className="relative z-20 mt-10 border-t bg-black/70 backdrop-blur" style={{ borderColor: "rgba(217,119,6,0.2)" }}>
        <div className="mx-auto max-w-7xl px-6 py-14 grid gap-10 md:grid-cols-4">
          <div>
            <div className="text-2xl font-extrabold" style={{ color: BANKBROS_ORANGE }}>BankBros</div>
            <p className="mt-3 text-sm text-gray-400">Live leaderboards and curated bonuses.</p>
           
          </div>
          <FooterCol title="Pages" links={["Home", "Bonuses", "Leaderboards"]} />
          <FooterCol title="Socials" links={["Kick", "Discord", "X"]} />
          <FooterCol title="Legal" links={["Terms", "Privacy", "Responsible Gaming"]} />
        </div>
        <div className="mx-auto max-w-7xl px-6 pb-10 text-xs text-gray-500">© {new Date().getFullYear()} BankBros — All rights reserved.</div>
      </footer>
    </div>
  );
}

// ——— Components ———
function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="relative z-30">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between rounded-b-2xl border-b border-white/10 backdrop-blur supports-[backdrop-filter]:bg-black/40" style={{ boxShadow: "0 10px 40px -20px rgba(217,119,6,0.35)" }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `radial-gradient(ellipse at center, ${BANKBROS_ORANGE}, #7c3d0c)`, boxShadow: "0 0 30px rgba(217,119,6,0.6)" }}>BB</div>
          <span className="text-2xl font-extrabold tracking-tight" style={{ color: BANKBROS_ORANGE }}>BankBros</span>
        </div>
        <ul className="hidden md:flex items-center gap-8">
          <NavItem>Home</NavItem>
          <NavItem href="#bonuses">Bonuses</NavItem>
          <NavItem href="#leaderboards">Leaderboards</NavItem>
          <NavItem href="#rules">Rules</NavItem>
        </ul>
        <button aria-label="menu" className="md:hidden border rounded-xl px-3 py-2 text-sm" style={{ borderColor: BANKBROS_ORANGE, color: BANKBROS_ORANGE }} onClick={() => setOpen((v) => !v)}>
          Menu
        </button>
      </div>
      {open && (
        <div className="md:hidden mx-auto max-w-7xl px-6 py-3 grid gap-2">
          <a className="py-2 text-gray-200" href="#bonuses">Bonuses</a>
          <a className="py-2 text-gray-200" href="#leaderboards">Leaderboards</a>
          <a className="py-2 text-gray-200" href="#rules">Rules</a>
        </div>
      )}
    </nav>
  );
}

function NavItem({ children, href = "#" }) {
  return (
    <li className="relative group cursor-pointer tracking-wide text-sm md:text-base text-gray-300 hover:text-white">
      <a href={href}><span>{children}</span></a>
      <span className="absolute left-0 -bottom-1 h-[2px] w-0 group-hover:w-full transition-all duration-300" style={{ backgroundColor: BANKBROS_ORANGE }} />
    </li>
  );
}

function LeaderboardPreview() {
  const rows = useMemo(() => [
    { rank: 1, user: "BossBaby", points: 128430, prize: "$1,000" },
    { rank: 2, user: "BossBaby", points: 117210, prize: "$500" },
    { rank: 3, user: "BossBaby", points: 109980, prize: "$250" },
    { rank: 4, user: "BossBaby", points: 89340, prize: "$150" },
    { rank: 5, user: "BossBaby", points: 81120, prize: "$100" },
  ], []);

  return (
    <div className="p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-extrabold">August Race</div>
        <a href="/leaderboards" className="text-sm" style={{ color: BANKBROS_ORANGE }}>View all</a>
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
            <div className="col-span-5">{r.user}</div>
            <div className="col-span-3 text-gray-300">{r.points.toLocaleString()}</div>
            <div className="col-span-2 text-right font-semibold">{r.prize}</div>
          </div>
        ))}
      </div>

    </div>
  );
}

function BonusCarousel() {
  const items = [
    { id: 1, img: "/roobet.png", title: "Roobet — 100% up to $200", badge: "Exclusive" }

  ];
  return (
    <div className="relative">
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory p-4 md:p-6 scrollbar-thin" style={{ scrollSnapType: "x mandatory" }}>
        {items.map((it) => (
          <div key={it.id} className="min-w-[260px] md:min-w-[360px] snap-center rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="h-44 md:h-56 w-full overflow-hidden"><img src={it.img} alt={it.title} className="w-full h-full object-cover" /></div>
            <div className="p-4">
              <div className="text-sm uppercase tracking-wider" style={{ color: BANKBROS_ORANGE }}>{it.badge}</div>
              <div className="font-bold">{it.title}</div>
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

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="font-semibold mb-3" style={{ color: BANKBROS_ORANGE }}>{title}</div>
      <ul className="space-y-2 text-gray-300">
        {links.map((l) => (
          <li key={l} className="hover:text-white/90 cursor-pointer"><a href="#">{l}</a></li>
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

// ——— Data ———
const faqItems = [
  { q: "How do I earn points?", a: "Connect your casino account via our partner links and wager on supported games. Points scale with total wagered — check the Rules for the exact formula." },
  { q: "When are prizes paid?", a: "Payouts for monthly races occur within 72 hours after the leaderboard locks. Instant drops and weekly promos are credited as advertised." },
  { q: "Is there an entry fee?", a: "No entry fees. Participation is free — just play on partnered sites via BankBros to track your points." },
  { q: "How do you prevent abuse?", a: "We flag suspicious wager patterns, collusion, and risk-free loops. Violations may lead to point removal or disqualification." },
];

// ——— Helpers ———
function useFakeCounter(start, perSecond, jitter) {
  const base = typeof start === "number" ? start : 0;
  const rate = typeof perSecond === "number" ? perSecond : 1.2;
  const jit = Array.isArray(jitter) ? jitter : [0.3, 1];
  const [val, setVal] = useState(base);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t) => {
      const dt = (t - last) / 1000;
      last = t;
      const j = jit[0] + Math.random() * (jit[1] - jit[0]);
      setVal((v) => v + dt * rate * j * 13.37);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rate]);
  return val;
}

function formatMoney(n) {
  const whole = Math.floor(n);
  const parts = whole.toLocaleString();
  const cents = Math.floor((n - whole) * 100)
    .toString()
    .padStart(2, "0");
  return `$${parts}.${cents}`;
}
