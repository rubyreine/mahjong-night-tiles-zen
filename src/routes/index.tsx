import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import bgImg from "@/assets/hk-night.jpg";
import {
  generateSolvable,
  findHint,
  isFree,
  tilesMatch,
  type Difficulty,
  type Tile,
} from "@/lib/mahjong";
import { Board } from "@/components/mahjong/Board";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Pause, Play, Sparkles, RotateCcw, Shuffle, Plus, Crown, Sun, Moon, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: MahjongPage,
  head: () => ({
    meta: [
      { title: "Mahjong Solitaire — Hong Kong Nights" },
      { name: "description", content: "Play Mahjong Solitaire in a moody Hong Kong night setting. Authentic tiles, AI hints, daily challenges." },
    ],
  }),
});

function MahjongPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  // Defer random generation to client to avoid SSR hydration mismatch
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
  const seedRef = useRef(difficulty);

  useEffect(() => {
    setTiles(generateSolvable("medium"));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (paused) return;
    if (tiles.length === 0) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [paused, tiles.length]);

  const remainingTiles = useMemo(() => tiles.filter((t) => !t.removed).length, [tiles]);

  const startNew = useCallback((d: Difficulty) => {
    seedRef.current = d;
    setDifficulty(d);
    setTiles(generateSolvable(d));
    setSelectedId(null);
    setHintedIds(new Set());
    setHintsUsed(0);
    setMoves(0);
    setScore(0);
    setSeconds(0);
    setHistory([]);
    setPaused(false);
    setNoMovesOpen(false);
  }, []);

  const restart = useCallback(() => startNew(seedRef.current), [startNew]);

  const handleClick = useCallback((id: number) => {
    if (paused) return;
    setHintedIds(new Set());
    const tile = tiles.find((t) => t.id === id);
    if (!tile || tile.removed) return;
    const live = tiles.filter((t) => !t.removed);
    if (!isFree(tile, live)) return;

    if (selectedId === null) {
      setSelectedId(id);
      return;
    }
    if (selectedId === id) {
      setSelectedId(null);
      return;
    }
    const other = tiles.find((t) => t.id === selectedId);
    if (!other) return;
    if (tilesMatch(tile, other)) {
      setTiles((prev) =>
        prev.map((t) => (t.id === id || t.id === selectedId ? { ...t, removed: true } : t)),
      );
      setHistory((h) => [...h, [selectedId!, id]]);
      setMoves((m) => m + 1);
      setScore((s) => s + 10);
      setSelectedId(null);
      setTimeout(() => {
        setTiles((curr) => {
          const liveNow = curr.filter((t) => !t.removed);
          if (liveNow.length > 0 && !findHint(liveNow)) setNoMovesOpen(true);
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
    if (hintsUsed >= 3) {
      setProOpen(true);
      return;
    }
    const live = tiles.filter((t) => !t.removed);
    const pair = findHint(live);
    if (!pair) {
      setNoMovesOpen(true);
      return;
    }
    setHintedIds(new Set([pair[0].id, pair[1].id]));
    setHintsUsed((h) => h + 1);
    setTimeout(() => setHintedIds(new Set()), 4000);
  }, [tiles, hintsUsed]);

  const hintTip = useMemo(() => {
    if (hintedIds.size === 0) return "Tap to highlight a winning pair.";
    const tips = [
      "These tiles open new layers below.",
      "Removing this pair frees a corner.",
      "Top layer first — clear the dragon.",
      "Match these to unlock 3 more tiles.",
    ];
    return tips[hintsUsed % tips.length];
  }, [hintedIds, hintsUsed]);

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="relative h-screen overflow-hidden text-foreground flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img src={bgImg} alt="" className="app-bg-image h-full w-full object-cover" />
        <div
          className="app-bg-light absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, #fff8e6 0%, #f5e9c8 40%, #e8d5a0 100%)",
          }}
        />
        <div
          className="absolute inset-0 app-bg-image"
          style={{ background: "linear-gradient(180deg, oklch(0.08 0.02 25 / 0.78), oklch(0.08 0.02 25 / 0.92))" }}
        />
      </div>

      {/* Navbar */}
      <header className="px-6 md:px-10 pt-4 pb-2 flex items-center justify-between gap-4 shrink-0">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-wide leading-none">
          <span style={{ color: "#F5C842", textShadow: "0 0 18px rgba(245,200,66,0.55)" }}>Maj</span>
          <span className="text-foreground">hong</span>
        </h1>
        <nav className="flex items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="text-foreground hover:bg-foreground/10"
          >
            {theme === "dark" ? <Sun className="size-4 mr-1" /> : <Moon className="size-4 mr-1" />}
            change theme
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLoginOpen(true)} className="text-foreground hover:bg-foreground/10">
            <LogIn className="size-4 mr-1" /> log in
          </Button>
          <Button
            onClick={() => setProOpen(true)}
            className="rounded-full bg-gradient-to-br from-[oklch(0.85_0.18_85)] to-[oklch(0.65_0.2_45)] text-[oklch(0.18_0.02_30)] font-semibold border border-[var(--gold)]/40 shadow-[0_0_24px_oklch(0.85_0.2_70_/_0.4)] hover:brightness-110"
          >
            <Crown className="size-4 mr-1" /> upgrade to pro
          </Button>
        </nav>
      </header>

      {/* Stats bar */}
      <div className="px-6 md:px-10 mt-2 shrink-0">
        <div className="pill mx-auto flex items-center gap-3 md:gap-6 px-4 md:px-6 py-2 max-w-4xl">
          <button
            onClick={() => setPaused((p) => !p)}
            className="size-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-foreground/10"
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
          <Stat label="time" value={time} />
          <Stat label="tiles" value={`${remainingTiles}`} />
          <Stat label="moves" value={`${moves}`} />
          <Stat label="score" value={`${score}`} />
        </div>
      </div>

      <main className="px-4 md:px-8 mt-3 pb-4 grid gap-4 lg:grid-cols-[240px_1fr] flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="grid gap-3 self-start lg:order-1 order-2 content-start">
          <UserPanel />
          <AIHelpPanel onHint={showHint} hintsUsed={hintsUsed} tip={hintTip} />
          <GameMenuPanel
            onNew={startNew}
            onRestart={restart}
            onShuffle={() => startNew(difficulty)}
            onUndo={undo}
            canUndo={history.length > 0}
            difficulty={difficulty}
          />
        </aside>

        {/* Board */}
        <section className="lg:order-2 order-1 min-h-0">
          <Board
            tiles={tiles}
            selectedId={selectedId}
            hintedIds={hintedIds}
            onTileClick={handleClick}
            paused={paused}
            onResume={() => setPaused(false)}
          />
          {tiles.length > 0 && remainingTiles === 0 && (
            <div className="mt-4 panel p-6 text-center">
              <h2 className="font-display text-2xl text-[var(--gold)] text-glow">You cleared the board.</h2>
              <p className="text-muted-foreground mt-1">+{Math.max(0, 500 - seconds)} bonus points</p>
              <Button onClick={() => startNew(difficulty)} className="mt-4">Play again</Button>
            </div>
          )}
        </section>
      </main>

      <Dialog open={noMovesOpen} onOpenChange={setNoMovesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No moves left</DialogTitle>
            <DialogDescription>The lanterns are dim. Try a fresh deal.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={restart}>Restart</Button>
            <Button onClick={() => startNew(difficulty)}>New layout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={proOpen} onOpenChange={setProOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-[var(--gold)]">Mahjong Pro</DialogTitle>
            <DialogDescription>Unlock the full lantern-lit experience.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            <li>✦ Custom tile skins (jade, lacquer, neon)</li>
            <li>✦ Unlimited AI hints</li>
            <li>✦ Exclusive Daily Challenge stats &amp; leaderboard</li>
            <li>✦ Cloud save across devices</li>
          </ul>
          <div className="rounded-lg border border-[var(--border)] p-4 bg-black/30">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-3xl text-[var(--gold)]">$4.99</span>
              <span className="text-xs text-muted-foreground">per month</span>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full bg-gradient-to-br from-[oklch(0.85_0.18_85)] to-[oklch(0.6_0.22_30)] text-[oklch(0.18_0.02_30)]">
              Continue with Stripe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in</DialogTitle>
            <DialogDescription>Save your wins, best times, and XP.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Authentication coming soon. Connect Lovable Cloud to enable saved progress, history, and the Daily Challenge leaderboard.
          </p>
          <DialogFooter><Button onClick={() => setLoginOpen(false)}>Got it</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-sm md:text-base text-foreground/70">{label}</span>
      <span className="px-2.5 py-0.5 rounded-md bg-foreground/10 border border-[var(--border)] font-mono text-sm text-[var(--gold)] min-w-[3rem] text-center">
        {value}
      </span>
    </div>
  );
}

function UserPanel() {
  return (
    <div className="panel p-4">
      <div className="font-display text-base text-[var(--gold)] mb-2">user</div>
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--crimson)] flex items-center justify-center font-display text-lg text-black/80 shadow-[var(--shadow-glow-gold)]">
          客
        </div>
        <div>
          <div className="font-medium text-sm">Guest</div>
          <div className="text-xs text-[var(--gold)]/80">Level 3 · 240 XP</div>
        </div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-foreground/10 overflow-hidden border border-[var(--border)]">
        <div className="h-full w-3/5 bg-gradient-to-r from-[var(--gold)] to-[var(--crimson)]" />
      </div>
    </div>
  );
}

function AIHelpPanel({ onHint, hintsUsed, tip }: { onHint: () => void; hintsUsed: number; tip: string }) {
  const remaining = Math.max(0, 3 - hintsUsed);
  return (
    <div className="panel p-4">
      <div className="font-display text-base text-[var(--gold)] mb-2">AI help</div>
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
  onNew, onRestart, onShuffle, onUndo, canUndo, difficulty,
}: {
  onNew: (d: Difficulty) => void;
  onRestart: () => void;
  onShuffle: () => void;
  onUndo: () => void;
  canUndo: boolean;
  difficulty: Difficulty;
}) {
  return (
    <div className="panel p-4">
      <div className="font-display text-base text-[var(--gold)] mb-2">game menu</div>
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
                    <span className="text-xs opacity-70">
                      {d === "easy" ? "Flat" : d === "medium" ? "Turtle" : "Pyramid"}
                    </span>
                  </Button>
                </DialogTrigger>
              ))}
            </div>
          </DialogContent>
        </Dialog>
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
