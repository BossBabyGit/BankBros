import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Medal, Timer, Trophy, Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import useLeaderboardCountdown from "./useLeaderboardCountdown";

const BANKBROS_ORANGE = "#d97706";

export default function LeaderboardPage() {
  // --- Demo data (replace with live API) ---
  const data = useMemo(() => ([
    { rank: 1, name: "BossBaby", wagered: 342130.32, prize: 1000 },
    { rank: 2, name: "BossBaby", wagered: 298220.18, prize: 500 },
    { rank: 3, name: "BossBaby", wagered: 251980.55, prize: 250 },
    { rank: 4, name: "BossBaby", wagered: 203140.00, prize: 150 },
    { rank: 5, name: "BossBaby", wagered: 181120.45, prize: 100 },
    { rank: 6, name: "BossBaby", wagered: 166780.12, prize: 75 },
    { rank: 7, name: "BossBaby", wagered: 154210.00, prize: 50 },
    { rank: 8, name: "BossBaby", wagered: 141033.47, prize: 40 },
    { rank: 9, name: "BossBaby", wagered: 132440.87, prize: 30 },
    { rank: 10, name: "BossBaby", wagered: 120008.03, prize: 20 },
  ]), []);

  const top3 = data.slice(0,3);
  const rest = data.slice(3,10);

  // --- Countdown to period end ---
  const { days, hours, minutes, seconds } = useLeaderboardCountdown();

  return (
    <div className="min-h-screen flex flex-col text-white bg-black">
      <Navbar />

      {/* Header */}
      <header className="relative border-b border-white/10 bg-black/60 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-12 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-3">
            <Users size={16} />
            <span>Monthly Race</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Leaderboard</h1>
          <p className="mt-3 text-gray-300">
            Every <span style={{color:BANKBROS_ORANGE}}>$1</span> you wager using code <b style={{color:BANKBROS_ORANGE}}>BANKBROS</b> counts toward the leaderboard. Play fair, climb fast, win cash.
          </p>
        </div>
      </header>

      {/* Podium */}
      <section className="relative py-12 md:py-16 px-6 flex-1">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 items-end">
            <PodiumCard
              placement={1}
              item={top3[0]}
              className="sm:order-2"
              height="h-64"
              tint="rgba(217,119,6,0.14)"
              edgeColor={BANKBROS_ORANGE}
              badge={<Crown className="drop-shadow" size={22} color={BANKBROS_ORANGE} />}
              highlight
            />
            <PodiumCard
              placement={2}
              item={top3[1]}
              className="sm:order-1"
              height="h-56"
              tint="rgba(165, 243, 252, 0.12)"
              edgeColor="#67e8f9"
              badge={<MedalRibbon n={2} color="#67e8f9" />}
            />
            <PodiumCard
              placement={3}
              item={top3[2]}
              className="sm:order-3"
              height="h-48"
              tint="rgba(250, 204, 21, 0.10)"
              edgeColor="#fde047"
              badge={<MedalRibbon n={3} color="#fde047" />}
            />
          </div>
        </div>
      </section>

      {/* Countdown */}
      <section className="px-2 pb-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 md:p-2 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-4"><Timer size={8}/><span>Time left in this race</span></div>
            <div className="grid grid-cols-4 gap-3 md:gap-2">
              <TimeTile label="Days" value={days} />
              <TimeTile label="Hours" value={hours} />
              <TimeTile label="Minutes" value={minutes} />
              <TimeTile label="Seconds" value={seconds} />
            </div>
            <p className="text-gray-500 text-xs mt-3">Resets every 14 days at 00:00 UTC.</p>
          </div>
        </div>
      </section>

      {/* Table 4-10 */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="bg-white/[0.03] px-5 py-2 text-xs uppercase tracking-wider text-gray-400 grid grid-cols-12">
              <div className="col-span-2">Rank</div>
              <div className="col-span-5">Player</div>
              <div className="col-span-3">Wagered</div>
              <div className="col-span-2 text-right">Prize</div>
            </div>
            <div className="divide-y divide-white/5">
              {rest.map((r) => (
                <div key={r.rank} className="grid grid-cols-12 px-5 py-3 items-center hover:bg-white/[0.02]">
                  <div className="col-span-2 font-bold text-gray-200">#{r.rank}</div>
                  <div className="col-span-5 font-medium">{maskName(r.name)}</div>
                  <div className="col-span-3 text-gray-300">{formatMoney(r.wagered)}</div>
                  <div className="col-span-2 text-right font-semibold" style={{color:BANKBROS_ORANGE}}>{formatMoney(r.prize)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tiny extras */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
            <BadgeCard icon={<Trophy size={16}/>} title="Cash Prizes" desc="Top 10 paid — no wagering requirements on cash."/>
            <BadgeCard icon={<Sparkles size={16}/>} title="Monthly Leaderboards" desc="Participate in the Leaderboard each month for active players."/>
            <BadgeCard icon={<Users size={16}/>} title="Fair Play" desc="Anti-abuse checks & manual reviews if needed."/>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// Navbar component reused from home
function Navbar(){
  return (
    <nav className="relative z-20">
      <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between backdrop-blur supports-[backdrop-filter]:bg-black/40 rounded-b-2xl border-b border-white/10" style={{ boxShadow: "0 10px 40px -20px rgba(217,119,6,0.35)" }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `radial-gradient(ellipse at center, ${BANKBROS_ORANGE}, #7c3d0c)` , boxShadow: "0 0 30px rgba(217,119,6,0.6)"}}>BB</div>
          <span className="text-2xl font-extrabold tracking-tight" style={{ color: BANKBROS_ORANGE }}>BankBros</span>
        </div>
        <ul className="flex items-center gap-8 text-sm">
          <li>Home</li>
          <li>Bonuses</li>
          <li>Leaderboards</li>
        </ul>
      </div>
    </nav>
  );
}

// Footer component reused from home
function Footer(){
  return (
    <footer className="relative z-20 mt-10 border-t bg-black/70 backdrop-blur" style={{ borderColor: "rgba(217,119,6,0.2)" }}>
      <div className="mx-auto max-w-7xl px-6 py-14 grid gap-10 md:grid-cols-4">
        <div>
          <div className="text-2xl font-extrabold" style={{ color: BANKBROS_ORANGE }}>BankBros</div>
          <p className="mt-3 text-sm text-gray-400">Live leaderboards and curated bonuses.</p>
        </div>
        <FooterCol title="Pages" links={["Home","Bonuses","Leaderboards"]} />
        <FooterCol title="Socials" links={["Kick","Discord","Twitter"]} />
        <FooterCol title="Legal" links={["Terms","Privacy","Responsible Gaming"]} />
      </div>
      <div className="mx-auto max-w-7xl px-6 pb-10 text-xs text-gray-500">© 2025 BankBros — All rights reserved.</div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="font-semibold mb-3" style={{ color: BANKBROS_ORANGE }}>{title}</div>
      <ul className="space-y-2 text-gray-300">
        {links.map((l) => (
          <li key={l} className="hover:text-white/90 cursor-pointer">{l}</li>
        ))}
      </ul>
    </div>
  );
}

// ——— Components ———
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
      <div className={`rounded-3xl ${height} p-5 md:p-6 flex flex-col justify-end`} style={{
        background: `linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.2)), radial-gradient(120% 160% at 50% 0%, ${tint}, transparent 60%)`,
        border: `1px solid ${edgeColor}40`,
        transform: "perspective(800px) rotateX(4deg)",
        ...edge,
      }}>
        {/* top label */}
        <div className={`absolute -top-3 left-5 px-3 py-1 rounded-xl text-xs tracking-wide ${ribbon}`} style={{ border: `1px solid ${edgeColor}55` }}>
          {placement === 1 ? "Champion" : placement === 2 ? "Runner-up" : "Third"}
        </div>
        {/* badge */}
        <div className="absolute -top-5 right-5 bg-black/70 rounded-2xl p-2 border border-white/10" style={{ boxShadow: `0 10px 40px -20px ${edgeColor}88` }}>
          {badge}
        </div>
        {/* body */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-5xl font-black" style={{ color: highlight ? BANKBROS_ORANGE : "white" }}>#{item.rank}</div>
            <div className="text-lg font-semibold">{maskName(item.name)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Wagered</div>
            <div className="text-lg font-extrabold">{formatMoney(item.wagered)}</div>
            <div className="text-xs text-gray-400 mt-1">Prize</div>
            <div className="text-base font-bold" style={{color:BANKBROS_ORANGE}}>{formatMoney(item.prize)}</div>
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

function TimeTile({ label, value }){
  return (
    <div className="rounded-xl px-2 py-2 md:px-2 md:py-2 text-center border border-white/10 bg-black/20">
      <div className="text-2xl md:text-3xl font-black" style={{ color: BANKBROS_ORANGE }}>{String(value).padStart(2,"0")}</div>
      <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function BadgeCard({ icon, title, desc }){
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

// ——— Hooks ———

// ——— Utils ———
function maskName(name){
  if(!name) return "";
  const visible = name.slice(0,2);
  const hidden = "*".repeat(Math.max(name.length - 2, 0));
  return visible + hidden;
}

function formatMoney(n){
  const isIntPrize = Number.isInteger(n);
  const value = isIntPrize ? n : Math.round(n*100)/100;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: isIntPrize ? 0 : 2, maximumFractionDigits: 2 })}`;
}
