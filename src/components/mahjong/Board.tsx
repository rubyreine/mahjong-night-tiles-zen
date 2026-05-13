import { useEffect, useMemo, useRef, useState } from "react";
import type { Tile } from "@/lib/mahjong";
import { isFree } from "@/lib/mahjong";
import { TileView, TILE_DIMS } from "./Tile";
import { Pause } from "lucide-react";

interface Props {
  tiles: Tile[];
  selectedId: number | null;
  hintedIds: Set<number>;
  onTileClick: (id: number) => void;
  paused?: boolean;
  onResume?: () => void;
}

export function Board({ tiles, selectedId, hintedIds, onTileClick, paused, onResume }: Props) {
  const live = useMemo(() => tiles.filter((t) => !t.removed), [tiles]);
  const freeMap = useMemo(() => {
    const m = new Map<number, boolean>();
    for (const t of live) m.set(t.id, isFree(t, live));
    return m;
  }, [live]);

  const baseSize = useMemo(() => {
    let w = 0, h = 0;
    for (const t of live) {
      const right = (t.x * TILE_DIMS.TILE_W) / 2 - t.z * TILE_DIMS.TILE_DEPTH + TILE_DIMS.TILE_W;
      const bottom = (t.y * TILE_DIMS.TILE_H) / 2 - t.z * TILE_DIMS.TILE_DEPTH + TILE_DIMS.TILE_H;
      if (right > w) w = right;
      if (bottom > h) h = bottom;
    }
    return { width: w + 16, height: h + 16 };
  }, [live]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current;
      if (!el) return;
      const availW = el.clientWidth - 16;
      const availH = el.clientHeight - 16;
      if (availW <= 0 || availH <= 0) return;
      const s = Math.min(availW / baseSize.width, availH / baseSize.height);
      setScale(Math.max(0.25, Math.min(s, 2.4)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, [baseSize.width, baseSize.height]);

  const sorted = useMemo(
    () => live.slice().sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x),
    [live],
  );

  return (
    <div className="board-glass panel-radius border border-[var(--border)] p-3 md:p-4 shadow-2xl relative h-full flex">
      <div ref={wrapRef} className="relative w-full flex-1 min-h-0">
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: baseSize.width,
            height: baseSize.height,
            transform: `translate(-50%, -50%) scale(${scale.x}, ${scale.y})`,
            transformOrigin: "center center",
          }}
        >
          <div className="relative" style={{ width: baseSize.width, height: baseSize.height }}>
            {sorted.map((t) => (
              <TileView
                key={t.id}
                tile={t}
                free={freeMap.get(t.id) ?? false}
                selected={selectedId === t.id}
                hinted={hintedIds.has(t.id)}
                onClick={() => onTileClick(t.id)}
                scale={1}
              />
            ))}
          </div>
        </div>

        {paused && (
          <div
            className="absolute inset-0 flex items-center justify-center panel-radius z-40"
            style={{ background: "rgba(8,6,4,0.35)", backdropFilter: "blur(2px)" }}
          >
            <div
              className="flex flex-col items-center gap-4 px-10 py-8 panel-radius border border-[var(--gold)]/40 shadow-2xl"
              style={{ background: "linear-gradient(180deg, rgba(20,16,10,0.95), rgba(10,8,5,0.95))" }}
            >
              <Pause className="size-10 text-[var(--gold)]" />
              <div className="font-display text-4xl text-[var(--gold)] text-glow">Paused</div>
              <button
                onClick={onResume}
                className="px-8 py-2.5 rounded-lg bg-[var(--gold)] text-black font-semibold hover:brightness-110 shadow-lg"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
