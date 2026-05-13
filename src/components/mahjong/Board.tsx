import { useMemo } from "react";
import type { Tile } from "@/lib/mahjong";
import { isFree } from "@/lib/mahjong";
import { TileView, TILE_DIMS } from "./Tile";

interface Props {
  tiles: Tile[];
  selectedId: number | null;
  hintedIds: Set<number>;
  onTileClick: (id: number) => void;
}

export function Board({ tiles, selectedId, hintedIds, onTileClick }: Props) {
  const live = useMemo(() => tiles.filter((t) => !t.removed), [tiles]);
  const freeMap = useMemo(() => {
    const m = new Map<number, boolean>();
    for (const t of live) m.set(t.id, isFree(t, live));
    return m;
  }, [live]);

  const { width, height } = useMemo(() => {
    let w = 0, h = 0;
    for (const t of live) {
      const right = (t.x * TILE_DIMS.TILE_W) / 2 - t.z * TILE_DIMS.TILE_DEPTH + TILE_DIMS.TILE_W;
      const bottom = (t.y * TILE_DIMS.TILE_H) / 2 - t.z * TILE_DIMS.TILE_DEPTH + TILE_DIMS.TILE_H;
      if (right > w) w = right;
      if (bottom > h) h = bottom;
    }
    return { width: w + 24, height: h + 24 };
  }, [live]);

  // sort: paint lower z first, then lower y, then lower x
  const sorted = useMemo(
    () => live.slice().sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x),
    [live],
  );

  return (
    <div className="felt rounded-2xl border border-[var(--border)] p-4 md:p-6 shadow-2xl">
      <div className="overflow-auto">
        <div className="relative mx-auto" style={{ width, height }}>
          {sorted.map((t) => (
            <TileView
              key={t.id}
              tile={t}
              free={freeMap.get(t.id) ?? false}
              selected={selectedId === t.id}
              hinted={hintedIds.has(t.id)}
              onClick={() => onTileClick(t.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
