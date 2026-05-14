import { tileGlyph, type Tile } from "@/lib/mahjong";
import { cn } from "@/lib/utils";

const TILE_W = 56;
const TILE_H = 76;
const TILE_DEPTH = 6;

interface Props {
  tile: Tile;
  free: boolean;
  selected: boolean;
  hinted: boolean;
  onClick: () => void;
  scale?: number;
}

// Suit-specific face renderers — match TheMahjong.com style
function TileFace({ kind, scale }: { kind: string; scale: number }) {
  const s = (n: number) => Math.round(n * scale);

  // Characters: 萬 — big black kanji + red number top-left
  if (kind.startsWith("char-")) {
    const n = kind.slice(5);
    const numerals = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ color: "#c0392b", fontSize: s(22), lineHeight: 1, fontWeight: 800 }} className="font-han">
          {numerals[+n]}
        </span>
        <span style={{ color: "#1a1a1a", fontSize: s(28), lineHeight: 1, marginTop: s(2), fontWeight: 800 }} className="font-han">
          萬
        </span>
      </div>
    );
  }

  // Bamboo: vertical green sticks (1 = bird)
  if (kind.startsWith("bam-")) {
    const n = +kind.slice(4);
    if (n === 1) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: s(32) }}>🐦</span>
        </div>
      );
    }
    const sticks = Array.from({ length: n });
    const cols = n <= 3 ? 1 : n <= 6 ? 2 : 3;
    return (
      <div
        className="absolute inset-0 grid place-items-center p-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: s(2) }}
      >
        {sticks.map((_, i) => (
          <div
            key={i}
            style={{
              width: s(7),
              height: s(16),
              background: "linear-gradient(180deg,#2e7a3e,#1d5a2a)",
              borderRadius: s(2),
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          />
        ))}
      </div>
    );
  }

  // Circles: dot patterns (green ring + red center)
  if (kind.startsWith("circle-")) {
    const n = +kind.slice(7);
    const dots = Array.from({ length: n });
    const cols = n <= 3 ? 1 : n <= 6 ? 2 : 3;
    return (
      <div
        className="absolute inset-0 grid place-items-center p-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: s(2) }}
      >
        {dots.map((_, i) => (
          <div
            key={i}
            style={{
              width: s(11),
              height: s(11),
              borderRadius: "9999px",
              background: "radial-gradient(circle, #c0392b 0 25%, #fff 28% 45%, #2e7a3e 48% 100%)",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
            }}
          />
        ))}
      </div>
    );
  }

  // Winds & Dragons: large centered kanji
  const g = tileGlyph(kind);
  let color = "#1a1a1a";
  if (kind === "dragon-R") color = "#c0392b";
  else if (kind === "dragon-G") color = "#1d5a2a";

  if (kind === "dragon-W") {
    return (
      <div className="absolute inset-2 rounded border-[3px]" style={{ borderColor: "#1a4a8a" }} />
    );
  }

  if (kind.startsWith("flower-") || kind.startsWith("season-")) {
    const num = kind.slice(-1);
    const isFlower = kind.startsWith("flower-");
    const labels = isFlower ? ["", "梅", "蘭", "菊", "竹"] : ["", "春", "夏", "秋", "冬"];
    const accent = isFlower ? "#c0392b" : "#1d5a2a";
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-center gap-1">
          <span style={{ color: accent, fontSize: s(15), fontWeight: 700 }} className="font-han">
            {labels[+num]}
          </span>
          <span style={{ color: "#1a4a8a", fontSize: s(13), fontWeight: 700 }}>{num}</span>
        </div>
        <span style={{ fontSize: s(22), lineHeight: 1, color: accent }}>{isFlower ? "❀" : "✿"}</span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="font-han font-bold leading-none" style={{ color, fontSize: s(36) }}>
        {g.label.length === 1 ? g.label : g.label.slice(0, 1)}
      </span>
    </div>
  );
}

export function TileView({ tile, free, selected, hinted, onClick, scale = 1 }: Props) {
  const w = TILE_W * scale;
  const h = TILE_H * scale;
  const depth = TILE_DEPTH * scale;
  const left = (tile.x * w) / 2 - tile.z * depth;
  const top = (tile.y * h) / 2 - tile.z * depth;

  return (
    <button
      onClick={onClick}
      disabled={!free}
      aria-label={tileGlyph(tile.kind).label}
      className={cn(
        "absolute select-none transition-all duration-150 flex items-center justify-center overflow-hidden",
        free ? "cursor-pointer hover:-translate-y-0.5" : "cursor-not-allowed",
        selected && "ring-4 ring-[var(--gold)] glow-gold scale-105 z-50",
        hinted && "tile-hint",
      )}
      style={{
        left,
        top,
        width: w,
        height: h,
        borderRadius: Math.round(7 * scale),
        zIndex: tile.z * 1000 + tile.y * 4 + tile.x,
        background: "linear-gradient(160deg, #ffffff 0%, #fbf6e8 55%, #ece1c2 100%)",
        border: `${Math.max(1, Math.round(2 * scale))}px solid #1d5a2a`,
        boxShadow: free
          ? `inset 0 0 0 1px #ffffff, 0 ${depth}px 0 #0f3a1a, 0 ${depth + 4}px 12px rgba(0,0,0,0.55)`
          : `inset 0 0 0 1px #6b8a6b, 0 ${Math.max(1, depth - 2)}px 0 #0f3a1a, 0 ${depth}px 6px rgba(0,0,0,0.5)`,
      }}
    >
      <TileFace kind={tile.kind} scale={scale} />
      {!free && (
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(20,15,8,0.45)", borderRadius: "inherit" }}
        />
      )}
    </button>
  );
}

export const TILE_DIMS = { TILE_W, TILE_H, TILE_DEPTH };
