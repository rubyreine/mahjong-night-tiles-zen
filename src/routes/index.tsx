import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  generateSolvable,
  findHint,
  freeTiles,
  isFree,
  tilesMatch,
  type Difficulty,
  type Tile,
} from "@/lib/mahjong";
import { Board } from "@/components/mahjong/Board";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Pause, Play, Sparkles, RotateCcw, Shuffle, Plus, Crown, Sun, Moon, User as UserIcon,
  Calendar, Trophy, Flame, Bot, Gamepad2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: MahjongPage,
  head: () => ({
    meta: [
      { title: "Mahjong Solitaire — Hong Kong Nights" },
      { name: "description", content: "Play Mahjong Solitaire under Hong Kong lanterns. Daily Challenge, AI hints, leaderboards." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
  }),
});

// --- Seeded RNG (LCG) for Daily Challenge ---
function withSeed<T>(seed: number, fn: () => T): T {
  const orig = Math.random;
  let s = seed >>> 0 || 1;
  Math.random = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  try { return fn(); } finally { Math.random = orig; }
}
function todaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function MahjongPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [history, setHistory] = useState<Array<[number, number]>>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hintedIds, setHintedIds] = useState<Set<number>>(new Set());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [proOpen, setProOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [noMovesOpen, setNoMovesOpen] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [streak, setStreak] = useState(1);
  const [isDaily, setIsDaily] = useState(false);
  const [mobileTab, setMobileTab] = useState<null | "user" | "ai" | "menu">(null);
  const seedRef = useRef<{ d: Difficulty; daily: boolean }>({ d: "medium", daily: false });

  useEffect(() => {
    setTiles(generateSolvable("medium"));
    // streak tracking (local fallback; real persistence needs Cloud)
    try {
      const last = localStorage.getItem("mj-last");
      const s = parseInt(localStorage.getItem("mj-streak") || "1", 10);
      const today = new Date().toDateString();
      if (last === today) setStreak(s);
      else if (last && new Date(last).getTime() > Date.now() - 1000 * 60 * 60 * 48) {
        setStreak(s + 1);
        localStorage.setItem("mj-streak", String(s + 1));
      } else {
        setStreak(1);
        localStorage.setItem("mj-streak", "1");
      }
      localStorage.setItem("mj-last", today);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (paused || tiles.length === 0 || winOpen) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [paused, tiles.length, winOpen]);

  const remainingTiles = useMemo(() => tiles.filter((t) => !t.removed).length, [tiles]);
  const live = useMemo(() => tiles.filter((t) => !t.removed), [tiles]);
  const freeCount = useMemo(() => (live.length ? freeTiles(live).length : 0), [live]);

  const startNew = useCallback((d: Difficulty, daily = false) => {
    seedRef.current = { d, daily };
    setDifficulty(d);
    setIsDaily(daily);
    const newTiles = daily ? withSeed(todaySeed(), () => generateSolvable(d)) : generateSolvable(d);
    setTiles(newTiles);
    setSelectedId(null);
    setHintedIds(new Set());
    setHintsUsed(0);
    setMoves(0);
    setScore(0);
    setSeconds(0);
    setHistory([]);
    setPaused(false);
    setNoMovesOpen(false);
    setWinOpen(false);
    setMobileTab(null);
  }, []);

  const restart = useCallback(() => startNew(seedRef.current.d, seedRef.current.daily), [startNew]);

  const handleClick = useCallback((id: number) => {
    if (paused) return;
    setHintedIds(new Set());
    const tile = tiles.find((t) => t.id === id);
    if (!tile || tile.removed) return;
    const liveNow = tiles.filter((t) => !t.removed);
    if (!isFree(tile, liveNow)) {
      console.log("[mahjong] click ignored — tile not free", { id, kind: tile.kind });
      return;
    }

    if (selectedId === null) { setSelectedId(id); return; }
    if (selectedId === id) { setSelectedId(null); return; }
    const other = tiles.find((t) => t.id === selectedId);
    if (!other || other.removed) { setSelectedId(id); return; }
    // Re-check that the previously selected tile is still free
    if (!isFree(other, liveNow)) { setSelectedId(id); return; }
    const match = tilesMatch(tile, other);
    console.log("[mahjong] match attempt", {
      a: { id: other.id, kind: other.kind },
      b: { id: tile.id, kind: tile.kind },
      match,
    });
    if (match) {
      setTiles((prev) => prev.map((t) => (t.id === id || t.id === selectedId ? { ...t, removed: true } : t)));
      setHistory((h) => [...h, [selectedId!, id]]);
      setMoves((m) => m + 1);
      setScore((s) => s + 10);
      setSelectedId(null);
      setTimeout(() => {
        setTiles((curr) => {
          const liveAfter = curr.filter((t) => !t.removed);
          if (liveAfter.length === 0) setWinOpen(true);
          else if (!findHint(liveAfter)) setNoMovesOpen(true);
          return curr;
        });
      }, 200);
    } else {
      setSelectedId(id);
    }
  }, [tiles, selectedId, paused]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setTiles((prev) => prev.map((t) => (t.id === last[0] || t.id === last[1] ? { ...t, removed: false } : t)));
    setMoves((m) => Math.max(0, m - 1));
    setScore((s) => Math.max(0, s - 12));
  }, [history]);

  const showHint = useCallback(() => {
    if (hintsUsed >= 3) { setProOpen(true); return; }
    const pair = findHint(live);
    if (!pair) { setNoMovesOpen(true); return; }
    setHintedIds(new Set([pair[0].id, pair[1].id]));
    setHintsUsed((h) => h + 1);
    setTimeout(() => setHintedIds(new Set()), 4000);
  }, [live, hintsUsed]);

  // Contextual AI coach tip based on game state
  const hintTip = useMemo(() => {
    if (live.length === 0) return "Start a new game to see strategy tips.";
    const pairsLeft = Math.floor(live.length / 2);
    if (live.length <= 6) return `Almost there! Only ${pairsLeft} pairs left 🎉`;
    const topZ = Math.max(...live.map((t) => t.z));
    if (topZ >= 2 && hintedIds.size > 0) return "Open the top layer first — it frees the most tiles!";
    if (freeCount <= 4) return `Only ${freeCount} free tiles — this move opens new paths.`;
    if (hintedIds.size > 0) return "Removing this pair frees a corner.";
    return "Tap to highlight a winning pair.";
  }, [live, freeCount, hintedIds]);

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const onPro = () => setProOpen(true);
  const onLogin = () => setLoginOpen(true);
  const onLeader = () => setLeaderOpen(true);
  const onDaily = () => startNew("medium", true);

  return (
    <div className="relative min-h-screen text-foreground flex flex-col">
      <div className="app-bg-fixed" />
      <div className="app-bg-overlay" />

      {/* Navbar */}
      <header className="px-3 sm:px-6 md:px-10 pt-3 sm:pt-4 pb-2 flex items-center justify-between gap-2 shrink-0 relative z-50">
        <h1 className="font-logo text-2xl sm:text-4xl md:text-5xl leading-none">
          <span style={{ color: "#F5C842", textShadow: "0 0 18px rgba(245,200,66,0.55)" }}>Mah</span>
          <span className="text-foreground">jong</span>
        </h1>
        <nav className="flex items-center gap-1 sm:gap-3">
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="size-9 sm:size-auto sm:px-3 sm:py-1.5 rounded-full sm:rounded-md flex items-center justify-center hover:bg-foreground/10 text-foreground"
            aria-label="change theme"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span className="hidden sm:inline ml-1 text-sm">change theme</span>
          </button>
          <button
            onClick={onLogin}
            className="size-9 sm:size-auto sm:px-3 sm:py-1.5 rounded-full sm:rounded-md flex items-center justify-center hover:bg-foreground/10 text-foreground"
            aria-label="log in"
          >
            <UserIcon className="size-4" />
            <span className="hidden sm:inline ml-1 text-sm">log in</span>
          </button>
          <Button
            onClick={onPro}
            size="sm"
            className="rounded-full bg-gradient-to-br from-[oklch(0.85_0.18_85)] to-[oklch(0.65_0.2_45)] text-[oklch(0.18_0.02_30)] font-semibold border border-[var(--gold)]/40 shadow-[0_0_24px_oklch(0.85_0.2_70_/_0.4)] hover:brightness-110 px-3 sm:px-4"
          >
            <Crown className="size-4 sm:mr-1" />
            <span className="hidden sm:inline">upgrade to pro</span>
          </Button>
        </nav>
      </header>

      <main className="px-2 sm:px-4 md:px-8 mt-2 sm:mt-3 pb-20 lg:pb-4 grid gap-3 lg:grid-cols-[240px_1fr] flex-1 min-h-0">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex flex-col gap-3 self-stretch h-full">
          <UserPanel streak={streak} />
          <AIHelpPanel onHint={showHint} hintsUsed={hintsUsed} tip={hintTip} />
          <GameMenuPanel
            onNew={startNew} onRestart={restart} onShuffle={() => startNew(difficulty)}
            onUndo={undo} canUndo={history.length > 0} difficulty={difficulty}
            onDaily={onDaily} onLeader={onLeader}
          />
        </aside>

        {/* Right column: stats + board */}
        <section className="min-h-0 flex flex-col gap-2 sm:gap-3">
          <div className="pill flex items-center gap-1.5 sm:gap-3 md:gap-6 px-2 sm:px-4 md:px-6 py-1.5 sm:py-2 w-full overflow-x-hidden">
            <button
              onClick={() => setPaused((p) => !p)}
              className="size-7 sm:size-8 shrink-0 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-foreground/10"
              aria-label={paused ? "Resume" : "Pause"}
            >
              {paused ? <Play className="size-3.5 sm:size-4" /> : <Pause className="size-3.5 sm:size-4" />}
            </button>
            <Stat label="time" value={time} />
            <Stat label="tiles" value={`${remainingTiles}`} />
            <Stat label="moves" value={`${moves}`} />
            <Stat label="score" value={`${score}`} />
            {isDaily && (
              <span className="hidden sm:inline-flex items-center gap-1 ml-auto text-xs text-[var(--gold)]">
                <Calendar className="size-3" /> Daily
              </span>
            )}
          </div>
          <div className="flex-1 min-h-[360px] lg:min-h-0">
            <Board
              tiles={tiles}
              selectedId={selectedId}
              hintedIds={hintedIds}
              onTileClick={handleClick}
              paused={paused}
              onResume={() => setPaused(false)}
            />
          </div>
        </section>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 pill rounded-t-2xl rounded-b-none border-t border-[var(--border)] flex justify-around items-center py-2 px-3 backdrop-blur-xl">
        <TabBtn icon={<UserIcon className="size-5" />} label="User" onClick={() => setMobileTab("user")} />
        <TabBtn icon={<Bot className="size-5" />} label="AI" onClick={() => setMobileTab("ai")} />
        <TabBtn icon={<Gamepad2 className="size-5" />} label="Menu" onClick={() => setMobileTab("menu")} />
      </nav>

      <Sheet open={mobileTab !== null} onOpenChange={(o) => !o && setMobileTab(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl border-t border-[var(--border)] bg-[oklch(0.12_0.02_25_/_0.95)] backdrop-blur-xl">
          <SheetHeader>
            <SheetTitle className="font-display text-xl text-[var(--gold)] capitalize">
              {mobileTab === "user" ? "User" : mobileTab === "ai" ? "AI Help" : "Game Menu"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-3">
            {mobileTab === "user" && <UserPanel streak={streak} embedded />}
            {mobileTab === "ai" && <AIHelpPanel onHint={() => { showHint(); setMobileTab(null); }} hintsUsed={hintsUsed} tip={hintTip} embedded />}
            {mobileTab === "menu" && (
              <GameMenuPanel
                onNew={(d) => { startNew(d); setMobileTab(null); }}
                onRestart={() => { restart(); setMobileTab(null); }}
                onShuffle={() => { startNew(difficulty); setMobileTab(null); }}
                onUndo={() => { undo(); setMobileTab(null); }}
                canUndo={history.length > 0} difficulty={difficulty}
                onDaily={() => { onDaily(); setMobileTab(null); }}
                onLeader={() => { onLeader(); setMobileTab(null); }}
                embedded
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* No moves */}
      <Dialog open={noMovesOpen} onOpenChange={setNoMovesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-[var(--gold)]">No more moves!</DialogTitle>
            <DialogDescription>The lanterns are dim. Shuffle the board or start fresh.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={restart}>Restart</Button>
            <Button onClick={() => startNew(difficulty)}>New layout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Win modal with confetti */}
      <Dialog open={winOpen} onOpenChange={setWinOpen}>
        <DialogContent className="max-w-md overflow-hidden">
          <Confetti />
          <DialogHeader>
            <DialogTitle className="font-display text-3xl text-[var(--gold)] text-glow text-center">
              {isDaily ? "Today's Challenge Complete! ⭐" : "You cleared the board! 🎉"}
            </DialogTitle>
            <DialogDescription className="text-center">
              +{Math.max(0, 500 - seconds)} bonus points · +25 XP
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 my-3 text-center">
            <WinStat label="Time" value={time} />
            <WinStat label="Moves" value={`${moves}`} />
            <WinStat label="Score" value={`${score + Math.max(0, 500 - seconds)}`} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" className="flex-1" onClick={restart}>Play again</Button>
            <Button className="flex-1 bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90" onClick={() => startNew(difficulty)}>New game</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pro modal */}
      <Dialog open={proOpen} onOpenChange={setProOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-[var(--gold)]">Unlock the Full Experience 👑</DialogTitle>
            <DialogDescription>Mahjong Pro — built for serious tile hunters.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5 text-sm">
            <li>✦ Unlimited AI hints</li>
            <li>✦ Custom tile themes (Stone · Gold · Jade)</li>
            <li>✦ Access to all layouts</li>
            <li>✦ Priority Daily Challenge leaderboard</li>
          </ul>
          <div className="grid grid-cols-3 gap-2 my-2">
            <ThemeCard name="Stone" gradient="linear-gradient(160deg,#e8e2d4,#a8a195)" />
            <ThemeCard name="Gold" gradient="linear-gradient(160deg,#fbe28a,#c9a14a)" />
            <ThemeCard name="Jade" gradient="linear-gradient(160deg,#bfe6cf,#3f8a5a)" />
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3 bg-black/30 flex items-baseline justify-between">
            <span className="font-display text-3xl text-[var(--gold)]">$4.99</span>
            <span className="text-xs text-muted-foreground">per month</span>
          </div>
          <DialogFooter>
            <Button
              className="w-full bg-gradient-to-br from-[oklch(0.85_0.18_85)] to-[oklch(0.6_0.22_30)] text-[oklch(0.18_0.02_30)]"
              onClick={() => toast("Stripe checkout coming soon", { description: "Enable Lovable Cloud + Stripe to start trials." })}
            >
              Start Free Trial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in</DialogTitle>
            <DialogDescription>Save wins, history, and join the city leaderboard.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Authentication needs Lovable Cloud. Enable it to unlock email + Google login, saved game history, streak persistence, and the Daily Leaderboard.
          </p>
          <DialogFooter><Button onClick={() => setLoginOpen(false)}>Got it</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leaderboard (mock) */}
      <Dialog open={leaderOpen} onOpenChange={setLeaderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-[var(--gold)] flex items-center gap-2">
              <Trophy className="size-5" /> Daily Leaderboard
            </DialogTitle>
            <DialogDescription>Top times for today's challenge.</DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-[var(--border)]">
            {MOCK_LEADERBOARD.map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="w-6 text-[var(--gold)]">{i + 1}</span>
                <span className="flex-1 truncate">{row.name}</span>
                <span className="w-20 text-muted-foreground text-xs">{row.city}</span>
                <span className="font-mono text-[var(--gold)]">{row.time}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Real leaderboard requires Lovable Cloud.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MOCK_LEADERBOARD = [
  { name: "JadeFox", city: "HK", time: "02:14" },
  { name: "Lantern9", city: "Tokyo", time: "02:31" },
  { name: "DragonR", city: "Taipei", time: "02:48" },
  { name: "PandaQ", city: "Singapore", time: "03:02" },
  { name: "Koi", city: "Kyoto", time: "03:19" },
  { name: "Sakura", city: "Osaka", time: "03:27" },
  { name: "BambooX", city: "Shanghai", time: "03:41" },
  { name: "你", city: "—", time: "—" },
];

function TabBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs text-foreground/80 hover:text-[var(--gold)]">
      {icon}<span>{label}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
      <span className="font-display text-[11px] sm:text-base text-foreground/70">{label}</span>
      <span className="px-1.5 sm:px-2.5 py-0.5 rounded-md bg-foreground/10 border border-[var(--border)] font-mono text-[11px] sm:text-sm text-[var(--gold)] min-w-[2.2rem] sm:min-w-[3rem] text-center">
        {value}
      </span>
    </div>
  );
}

function WinStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-black/30 py-2">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono text-lg text-[var(--gold)]">{value}</div>
    </div>
  );
}

function ThemeCard({ name, gradient }: { name: string; gradient: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-2 text-center">
      <div className="h-10 rounded-md mb-1" style={{ background: gradient }} />
      <div className="text-xs text-foreground/80">{name}</div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 24 });
  const emojis = ["🎉", "✨", "🏮", "⭐", "🀄"];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 4.3) % 100}%`,
            animationDelay: `${(i % 8) * 0.15}s`,
            animationDuration: `${2.4 + (i % 5) * 0.4}s`,
          }}
        >
          {emojis[i % emojis.length]}
        </span>
      ))}
    </div>
  );
}

function UserPanel({ streak, embedded }: { streak: number; embedded?: boolean }) {
  return (
    <div className={cn(!embedded && "panel", "p-4")}>
      {!embedded && <div className="font-display text-base text-[var(--gold)] mb-2">user</div>}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--crimson)] flex items-center justify-center font-display text-lg text-black/80 shadow-[var(--shadow-glow-gold)]">
          客
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">Guest</div>
          <div className="text-xs text-[var(--gold)]/80">Level 3 · 240 XP</div>
        </div>
        <div className="flex items-center gap-1 text-sm text-orange-400">
          <Flame className="size-4" />{streak}
        </div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-foreground/10 overflow-hidden border border-[var(--border)]">
        <div className="h-full w-3/5 bg-gradient-to-r from-[var(--gold)] to-[var(--crimson)]" />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        {streak > 1 ? `${streak} day streak — keep it alive!` : "Play daily to build a streak 🔥"}
      </p>
      <p className="text-[10px] text-muted-foreground/70 mt-1">Sign in to sync history & XP across devices.</p>
    </div>
  );
}

function AIHelpPanel({ onHint, hintsUsed, tip, embedded }: { onHint: () => void; hintsUsed: number; tip: string; embedded?: boolean }) {
  const remaining = Math.max(0, 3 - hintsUsed);
  return (
    <div className={cn(!embedded && "panel", "p-4")}>
      {!embedded && <div className="font-display text-base text-[var(--gold)] mb-2">AI help</div>}
      <Button onClick={onHint} size="sm" className="w-full bg-[var(--crimson)]/80 hover:bg-[var(--crimson)] border border-[var(--gold)]/30">
        <Sparkles className="size-4 mr-2" /> Highlight best move
      </Button>
      <p className="text-xs text-muted-foreground mt-2 leading-snug">{tip}</p>
      <p className="text-[11px] text-[var(--gold)]/70 mt-1">
        {remaining > 0 ? `${remaining} free hints left` : "Get unlimited hints with Pro 🔓"}
      </p>
    </div>
  );
}

function GameMenuPanel({
  onNew, onRestart, onShuffle, onUndo, canUndo, difficulty, onDaily, onLeader, embedded,
}: {
  onNew: (d: Difficulty) => void;
  onRestart: () => void;
  onShuffle: () => void;
  onUndo: () => void;
  canUndo: boolean;
  difficulty: Difficulty;
  onDaily: () => void;
  onLeader: () => void;
  embedded?: boolean;
}) {
  return (
    <div className={cn(!embedded && "panel", "p-4")}>
      {!embedded && <div className="font-display text-base text-[var(--gold)] mb-2">game menu</div>}
      <div className="grid gap-1.5">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" className="justify-start"><Plus className="size-4 mr-2" /> New game</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Choose difficulty</DialogTitle>
              <DialogDescription>Each layout is shuffled to be solvable.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <DialogTrigger asChild key={d}>
                  <Button
                    onClick={() => onNew(d)}
                    variant={d === difficulty ? "default" : "secondary"}
                    className={cn("justify-between", d === difficulty && "bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90")}
                  >
                    <span className="capitalize">{d}</span>
                    <span className="text-xs opacity-70">{d === "easy" ? "Flat" : d === "medium" ? "Turtle" : "Pyramid"}</span>
                  </Button>
                </DialogTrigger>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="secondary" size="sm" className="justify-start bg-[var(--crimson)]/30 hover:bg-[var(--crimson)]/50 border border-[var(--gold)]/30" onClick={onDaily}>
          <Calendar className="size-4 mr-2" /> Daily Challenge
        </Button>
        <Button variant="secondary" size="sm" className="justify-start" onClick={onLeader}>
          <Trophy className="size-4 mr-2" /> Leaderboard
        </Button>
        <Button variant="secondary" size="sm" className="justify-start" onClick={onRestart}>
          <RotateCcw className="size-4 mr-2" /> Restart
        </Button>
        <Button variant="secondary" size="sm" className="justify-start" onClick={onShuffle}>
          <Shuffle className="size-4 mr-2" /> Random layout
        </Button>
        <Button variant="ghost" size="sm" disabled={!canUndo} onClick={onUndo} className="justify-start">
          ↶ Undo last move
        </Button>
      </div>
    </div>
  );
}
