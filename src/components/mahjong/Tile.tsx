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
}

export function TileView({ tile, free, selected, hinted, onClick }: Props) {
  const g = tileGlyph(tile.kind);
  const colorClass =
    g.color === "red" ? "text-[oklch(0.55_0.24_25)]"
    : g.color === "green" ? "text-[oklch(0.45_0.16_155)]"
    : g.color === "blue" ? "text-[oklch(0.45_0.14_240)]"
    : g.color === "gold" ? "text-[oklch(0.65_0.18_70)]"
    : "text-[oklch(0.2_0.04_30)]";

  // Convert grid units (half-tile) to pixels.
  // Grid unit = TILE_W/2 horizontally, TILE_H/2 vertically.
  const left = (tile.x * TILE_W) / 2 - tile.z * TILE_DEPTH;
  const top = (tile.y * TILE_H) / 2 - tile.z * TILE_DEPTH;

  return (
    <button
      onClick={onClick}
      disabled={!free}
      aria-label={g.label}
      className={cn(
        "absolute select-none transition-transform duration-150",
        "rounded-md flex items-center justify-center",
        free ? "cursor-pointer hover:-translate-y-0.5" : "cursor-not-allowed",
        selected && "ring-4 ring-[var(--gold)] glow-gold scale-105",
        hinted && "tile-hint",
      )}
      style={{
        left,
        top,
        width: TILE_W,
        height: TILE_H,
        zIndex: tile.z * 100 + tile.y * 2 + tile.x,
        background:
          "linear-gradient(180deg, oklch(0.98 0.02 85) 0%, oklch(0.92 0.03 80) 80%, oklch(0.78 0.05 70) 100%)",
        boxShadow: free
          ? "0 2px 0 oklch(0.65 0.06 60), 0 6px 14px oklch(0 0 0 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.7)"
          : "0 1px 0 oklch(0.5 0.04 60), 0 2px 6px oklch(0 0 0 / 0.6), inset 0 1px 0 oklch(1 0 0 / 0.4)",
        opacity: free ? 1 : 0.78,
        border: "1px solid oklch(0.55 0.04 60)",
      }}
    >
      <span className={cn("font-han leading-none", colorClass)} style={{ fontSize: 38 }}>
        {g.glyph}
      </span>
    </button>
  );
}

export const TILE_DIMS = { TILE_W, TILE_H, TILE_DEPTH };
