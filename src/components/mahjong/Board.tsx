import { useEffect, useMemo, useRef, useState } from "react";
import type { Tile } from "@/lib/mahjong";
import { isFree } from "@/lib/mahjong";
import { TileView, TILE_DIMS } from "./Tile";

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
      const availW = el.clientWidth - 8;
      const availH = el.clientHeight - 8;
      if (availW <= 0 || availH <= 0) return;
      const s = Math.min(availW / baseSize.width, availH / baseSize.height, 1.4);
      setScale(Math.max(0.4, s));
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
    <div className="felt rounded-2xl border border-[var(--border)] p-3 md:p-4 shadow-2xl relative">
      <div ref={wrapRef} className="relative w-full" style={{ height: "calc(100vh - 240px)", minHeight: 360 }}>
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: baseSize.width * scale,
            height: baseSize.height * scale,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="relative" style={{ width: baseSize.width * scale, height: baseSize.height * scale }}>
            {sorted.map((t) => (
              <TileView
                key={t.id}
                tile={t}
                free={freeMap.get(t.id) ?? false}
                selected={selectedId === t.id}
                hinted={hintedIds.has(t.id)}
                onClick={() => onTileClick(t.id)}
                scale={scale}
              />
            ))}
          </div>
        </div>

        {paused && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-xl z-[9999]"
            style={{ background: "rgba(8,6,4,0.65)", backdropFilter: "blur(10px)" }}
          >
            <div className="font-display text-5xl md:text-6xl text-[var(--gold)] text-glow mb-6">⏸ Paused</div>
            <button
              onClick={onResume}
              className="px-8 py-3 rounded-full bg-[var(--gold)] text-black font-semibold hover:brightness-110 shadow-lg"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
