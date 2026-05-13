import { tileGlyph, type Tile } from "@/lib/mahjong";
import { cn } from "@/lib/utils";

const TILE_W = 44;
const TILE_H = 60;
const TILE_DEPTH = 5;

interface Props {
  tile: Tile;
  free: boolean;
  selected: boolean;
  hinted: boolean;
  onClick: () => void;
  scale?: number;
}

export function TileView({ tile, free, selected, hinted, onClick, scale = 1 }: Props) {
  const g = tileGlyph(tile.kind);
  const colorClass =
    g.color === "red" ? "text-[oklch(0.5_0.22_25)]"
    : g.color === "green" ? "text-[oklch(0.42_0.16_155)]"
    : g.color === "blue" ? "text-[oklch(0.42_0.14_240)]"
    : g.color === "gold" ? "text-[oklch(0.6_0.18_70)]"
    : "text-[oklch(0.18_0.04_30)]";

  const w = TILE_W * scale;
  const h = TILE_H * scale;
  const depth = TILE_DEPTH * scale;
  const left = (tile.x * w) / 2 - tile.z * depth;
  const top = (tile.y * h) / 2 - tile.z * depth;

  return (
    <button
      onClick={onClick}
      disabled={!free}
      aria-label={g.label}
      className={cn(
        "absolute select-none transition-all duration-150 rounded-md flex items-center justify-center overflow-hidden",
        free ? "cursor-pointer hover:-translate-y-0.5" : "cursor-not-allowed",
        selected && "ring-4 ring-[var(--gold)] glow-gold scale-105 z-50",
        hinted && "tile-hint",
      )}
      style={{
        left,
        top,
        width: w,
        height: h,
        zIndex: tile.z * 1000 + tile.y * 4 + tile.x,
        background:
          "linear-gradient(180deg, #fffdf6 0%, #f7f1e0 70%, #e8dcc0 100%)",
        boxShadow: free
          ? `0 ${depth}px 0 #b89968, 0 ${depth + 4}px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px #d6bf8f`
          : `0 ${Math.max(1, depth - 2)}px 0 #8a7349, 0 ${depth}px 6px rgba(0,0,0,0.5), inset 0 0 0 1px #b89968`,
      }}
    >
      <span
        className={cn("font-han leading-none font-bold", colorClass)}
        style={{ fontSize: Math.round(34 * scale) }}
      >
        {g.glyph}
      </span>
      {!free && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-md pointer-events-none"
          style={{ background: "rgba(15,12,8,0.55)" }}
        />
      )}
    </button>
  );
}

export const TILE_DIMS = { TILE_W, TILE_H, TILE_DEPTH };
