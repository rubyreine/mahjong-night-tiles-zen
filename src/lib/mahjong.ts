// Mahjong Solitaire core logic

export type TileKind = string; // e.g. "char-1", "bam-5", "wind-E", "dragon-R", "flower-1", "season-1"

export interface Tile {
  id: number;
  kind: TileKind;
  x: number; // grid x (half-tile units)
  y: number; // grid y (half-tile units)
  z: number; // layer (0 bottom)
  removed: boolean;
}

// Unicode Mahjong tiles U+1F000..U+1F021
// Order: East South West North Red Green White
//        Char 1-9, Bam 1-9, Circle 1-9
//        Plum Orchid Chrysanth Bamboo, Spring Summer Autumn Winter
const KIND_TO_GLYPH: Record<string, { glyph: string; label: string; color: string }> = {
  "wind-E": { glyph: "🀀", label: "東", color: "ink" },
  "wind-S": { glyph: "🀁", label: "南", color: "ink" },
  "wind-W": { glyph: "🀂", label: "西", color: "ink" },
  "wind-N": { glyph: "🀃", label: "北", color: "ink" },
  "dragon-R": { glyph: "🀄", label: "中", color: "red" },
  "dragon-G": { glyph: "🀅", label: "發", color: "green" },
  "dragon-W": { glyph: "🀆", label: "白", color: "ink" },
  "char-1": { glyph: "🀇", label: "一萬", color: "ink" },
  "char-2": { glyph: "🀈", label: "二萬", color: "ink" },
  "char-3": { glyph: "🀉", label: "三萬", color: "ink" },
  "char-4": { glyph: "🀊", label: "四萬", color: "ink" },
  "char-5": { glyph: "🀋", label: "五萬", color: "ink" },
  "char-6": { glyph: "🀌", label: "六萬", color: "ink" },
  "char-7": { glyph: "🀍", label: "七萬", color: "ink" },
  "char-8": { glyph: "🀎", label: "八萬", color: "ink" },
  "char-9": { glyph: "🀏", label: "九萬", color: "ink" },
  "bam-1": { glyph: "🀐", label: "一索", color: "green" },
  "bam-2": { glyph: "🀑", label: "二索", color: "green" },
  "bam-3": { glyph: "🀒", label: "三索", color: "green" },
  "bam-4": { glyph: "🀓", label: "四索", color: "green" },
  "bam-5": { glyph: "🀔", label: "五索", color: "green" },
  "bam-6": { glyph: "🀕", label: "六索", color: "green" },
  "bam-7": { glyph: "🀖", label: "七索", color: "green" },
  "bam-8": { glyph: "🀗", label: "八索", color: "green" },
  "bam-9": { glyph: "🀘", label: "九索", color: "green" },
  "circle-1": { glyph: "🀙", label: "一筒", color: "blue" },
  "circle-2": { glyph: "🀚", label: "二筒", color: "blue" },
  "circle-3": { glyph: "🀛", label: "三筒", color: "blue" },
  "circle-4": { glyph: "🀜", label: "四筒", color: "blue" },
  "circle-5": { glyph: "🀝", label: "五筒", color: "blue" },
  "circle-6": { glyph: "🀞", label: "六筒", color: "blue" },
  "circle-7": { glyph: "🀟", label: "七筒", color: "blue" },
  "circle-8": { glyph: "🀠", label: "八筒", color: "blue" },
  "circle-9": { glyph: "🀡", label: "九筒", color: "blue" },
  "flower-1": { glyph: "🀢", label: "梅", color: "red" },
  "flower-2": { glyph: "🀣", label: "蘭", color: "red" },
  "flower-3": { glyph: "🀤", label: "菊", color: "red" },
  "flower-4": { glyph: "🀥", label: "竹", color: "red" },
  "season-1": { glyph: "🀦", label: "春", color: "gold" },
  "season-2": { glyph: "🀧", label: "夏", color: "gold" },
  "season-3": { glyph: "🀨", label: "秋", color: "gold" },
  "season-4": { glyph: "🀩", label: "冬", color: "gold" },
};

export function tileGlyph(kind: TileKind) {
  return KIND_TO_GLYPH[kind] ?? { glyph: "?", label: kind, color: "ink" };
}

// Two tiles match if same kind, OR both are flowers, OR both are seasons
export function tilesMatch(a: Tile, b: Tile): boolean {
  if (a.id === b.id) return false;
  if (a.kind === b.kind) return true;
  if (a.kind.startsWith("flower-") && b.kind.startsWith("flower-")) return true;
  if (a.kind.startsWith("season-") && b.kind.startsWith("season-")) return true;
  return false;
}

// A tile occupies a 2x2 footprint in the grid (tile is 2 grid units wide and tall)
// It is "blocked above" if any tile at z+1 overlaps its 2x2 footprint
// It is "blocked left" if there's a tile at same z whose footprint overlaps the
//   2x2 area immediately to the left, similarly for right.
function overlaps(ax: number, ay: number, bx: number, by: number) {
  return Math.abs(ax - bx) < 2 && Math.abs(ay - by) < 2;
}

export function isFree(tile: Tile, all: Tile[]): boolean {
  if (tile.removed) return false;
  let blockedAbove = false, blockedLeft = false, blockedRight = false;
  for (const t of all) {
    if (t.removed || t.id === tile.id) continue;
    if (t.z === tile.z + 1 && overlaps(t.x, t.y, tile.x, tile.y)) {
      blockedAbove = true;
    }
    if (t.z === tile.z) {
      if (Math.abs(t.y - tile.y) < 2) {
        if (t.x === tile.x - 2) blockedLeft = true;
        if (t.x === tile.x + 2) blockedRight = true;
      }
    }
    if (blockedAbove || (blockedLeft && blockedRight)) break;
  }
  return !blockedAbove && !(blockedLeft && blockedRight);
}

export function freeTiles(all: Tile[]): Tile[] {
  return all.filter((t) => isFree(t, all));
}

export function findHint(all: Tile[]): [Tile, Tile] | null {
  const free = freeTiles(all);
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (tilesMatch(free[i], free[j])) return [free[i], free[j]];
    }
  }
  return null;
}

// Build a tile bag: 4 of each suit/honor, 1 of each flower/season → 144 tiles
export function buildTileBag(): TileKind[] {
  const bag: TileKind[] = [];
  const fours: TileKind[] = [
    ...["wind-E", "wind-S", "wind-W", "wind-N"],
    ...["dragon-R", "dragon-G", "dragon-W"],
  ];
  for (let n = 1; n <= 9; n++) {
    fours.push(`char-${n}`, `bam-${n}`, `circle-${n}`);
  }
  for (const k of fours) for (let i = 0; i < 4; i++) bag.push(k);
  for (let n = 1; n <= 4; n++) bag.push(`flower-${n}`, `season-${n}`);
  return bag;
}

// Layouts as arrays of [x, y, z] positions on a half-tile grid.
// Each position represents the top-left corner of a 2x2 footprint.

function turtleLayout(): Array<[number, number, number]> {
  // Classic turtle: 144 positions across multiple layers.
  // Layer 0: 12 rows of varying widths totaling 87 tiles
  const positions: Array<[number, number, number]> = [];
  const rows: Array<[number, number]> = [
    // [startX, count]
    [2, 12], [6, 8], [4, 10], [4, 10], [2, 12], [2, 12],
    [4, 10], [4, 10], [6, 8], [2, 12],
  ];
  let y = 2;
  for (const [startX, count] of rows) {
    for (let i = 0; i < count; i++) positions.push([startX + i * 2, y, 0]);
    y += 2;
  }
  // edge tiles on layer 0
  positions.push([0, 8, 0], [0, 10, 0]); // far left
  positions.push([28, 8, 0], [28, 10, 0]); // far right
  positions.push([30, 8, 0]); // single right
  // Layer 1: 6x6 in middle = 36
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++) positions.push([8 + c * 2, 6 + r * 2, 1]);
  // Layer 2: 4x4 = 16
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) positions.push([10 + c * 2, 8 + r * 2, 2]);
  // Layer 3: 2x2 = 4
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 2; c++) positions.push([12 + c * 2, 10 + r * 2, 3]);
  // Layer 4: 1 capstone
  positions.push([13, 11, 4]);
  return positions.slice(0, 144);
}

function pyramidLayout(): Array<[number, number, number]> {
  const positions: Array<[number, number, number]> = [];
  // base 9x9 of 2x2 tiles? Use 8x... let's do increasing layers
  const sizes = [10, 8, 6, 4, 2];
  let total = 0;
  for (let z = 0; z < sizes.length; z++) {
    const s = sizes[z];
    const off = (10 - s);
    for (let r = 0; r < s; r++) {
      for (let c = 0; c < s; c++) {
        positions.push([off + c * 2, off + r * 2, z]);
        total++;
        if (total >= 144) return positions;
      }
    }
  }
  // pad with side rows on layer 0
  let y = 0;
  while (positions.length < 144) {
    positions.push([24 + ((positions.length % 4) * 2), y, 0]);
    y += 2;
  }
  return positions;
}

function easyLayout(): Array<[number, number, number]> {
  // simple flat 12x6 = 72 positions on layer 0, 1 layer of 12 in middle
  const positions: Array<[number, number, number]> = [];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 12; c++) positions.push([2 + c * 2, 4 + r * 2, 0]);
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++) positions.push([8 + c * 2, 6 + r * 2, 1]);
  return positions.slice(0, 144);
}

export type Difficulty = "easy" | "medium" | "hard";

export function layoutFor(d: Difficulty): Array<[number, number, number]> {
  if (d === "easy") return easyLayout();
  if (d === "hard") return pyramidLayout();
  return turtleLayout();
}

// Shuffle helper
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate a SOLVABLE deal by simulating a reverse-removal:
// pick free positions in pairs, assign matching tiles.
export function generateSolvable(d: Difficulty): Tile[] {
  const positions = layoutFor(d);
  const n = positions.length;
  const usePositions = positions.slice(0, n - (n % 2));
  const bag = shuffle(buildTileBag()).slice(0, usePositions.length);

  // create empty tiles at positions
  const tiles: Tile[] = usePositions.map(([x, y, z], i) => ({
    id: i,
    kind: "",
    x, y, z,
    removed: false,
  }));

  // Reverse simulation: place pairs onto free slots
  // Strategy: shuffle order, but only assign kinds in matching pairs.
  // Mark tiles assigned; iterate by picking 2 currently-"free" unassigned tiles.
  const assigned = new Set<number>();
  // Use a "virtual board": treat unassigned as not-yet-placed → free check uses placed only
  function freeUnassigned(): Tile[] {
    const placed = tiles.filter((t) => assigned.has(t.id));
    // a tile is reachable for placement if, on full layout, it'd be free when only placed tiles below/around exist
    // Simpler & solvable-friendly: a slot is free if no UNASSIGNED tile sits ABOVE it.
    return tiles.filter((t) => {
      if (assigned.has(t.id)) return false;
      // if any unassigned tile above → not yet pickable
      for (const o of tiles) {
        if (o.id === t.id) continue;
        if (assigned.has(o.id)) continue;
        if (o.z === t.z + 1 && overlaps(o.x, o.y, t.x, t.y)) return false;
      }
      // also need at least one free side at this z among unassigned
      let leftBlocked = false, rightBlocked = false;
      for (const o of tiles) {
        if (o.id === t.id || assigned.has(o.id)) continue;
        if (o.z !== t.z) continue;
        if (Math.abs(o.y - t.y) < 2) {
          if (o.x === t.x - 2) leftBlocked = true;
          if (o.x === t.x + 2) rightBlocked = true;
        }
      }
      return !(leftBlocked && rightBlocked);
    });
    void placed;
  }

  let bagIdx = 0;
  while (bagIdx < bag.length) {
    const free = shuffle(freeUnassigned());
    if (free.length < 2) {
      // fallback: assign remaining randomly
      const rest = tiles.filter((t) => !assigned.has(t.id));
      for (const t of rest) {
        t.kind = bag[bagIdx++] ?? "char-1";
        assigned.add(t.id);
      }
      break;
    }
    const a = free[0], b = free[1];
    const k1 = bag[bagIdx++];
    const k2 = bag[bagIdx++] ?? k1;
    a.kind = k1;
    b.kind = k2;
    assigned.add(a.id);
    assigned.add(b.id);
  }

  return tiles;
}
