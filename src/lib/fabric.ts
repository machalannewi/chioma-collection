// The curtain's cloth: an aida ground cross-stitched with a repeating sampler.
// Draws one seamless tile twice — a colour map and a matching relief (bump) map.
// Client-only (uses <canvas>).

type RGB = [number, number, number];

export const FABRIC = {
  ground: [125, 42, 28] as RGB,   // madder red
  hole: [46, 14, 9] as RGB,
  cream: '#f1e3c6',
  letter: '#c98a6c',              // tone-on-tone, so the name reads up close and vanishes from afar
  mustard: '#e2a83e',
  sage: '#8fa775',
  blush: '#e9a08a',
};

const SIZE = 1024;
const CELLS = 64;
const CELL = SIZE / CELLS;

// 5 × 7 letters, stitched one cross per '#'.
const GLYPHS: Record<string, string[]> = {
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
};

// Little motifs: y mustard petal, c cream centre, g sage leaf, b blush.
const FLOWER = ['..y..', '.yyy.', 'yycyy', '.yyy.', '..g..', 'gg.gg', '..g..'];
const DIAMOND = ['..b..', '.b.b.', 'b.c.b', '.b.b.', '..b..'];

type Stitch = [x: number, y: number, colour: string];

function seeded(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pattern(word = 'CHIOMA'): Stitch[] {
  const stitches: Stitch[] = [];
  const put = (x: number, y: number, colour: string) =>
    stitches.push([((x % CELLS) + CELLS) % CELLS, ((y % CELLS) + CELLS) % CELLS, colour]);
  const stamp = (rows: string[], x0: number, y0: number, colours: Record<string, string>) =>
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (colours[ch]) put(x0 + x, y0 + y, colours[ch]);
    }));

  const band = (x0: number, y0: number) => {
    let x = x0;
    for (const letter of word) {
      stamp(GLYPHS[letter] ?? GLYPHS.O, x, y0, { '#': FABRIC.letter });
      x += 6;
    }
    stamp(FLOWER, x + 3, y0, { y: FABRIC.mustard, c: FABRIC.cream, g: FABRIC.sage });
    stamp(DIAMOND, x + 11, y0 + 1, { b: FABRIC.blush, c: FABRIC.cream });
    stamp(FLOWER, x + 19, y0, { y: FABRIC.blush, c: FABRIC.cream, g: FABRIC.sage });
  };
  band(1, 6);
  band(33, 38); // half-drop repeat

  // Zig-zag borders between the bands.
  for (let x = 0; x < CELLS; x++) {
    const k = x % 4;
    const dy = k < 2 ? k : 4 - k;
    put(x, 20 + dy, FABRIC.cream);
    put(x, 52 + dy, FABRIC.cream);
  }
  return stitches;
}

const rgb = ([r, g, b]: RGB, k = 1, a = 1) =>
  `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`;

function canvas() {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  return c;
}

let cache: { colour: HTMLCanvasElement; relief: HTMLCanvasElement } | null = null;

export function makeFabric() {
  if (cache) return cache;
  const colour = canvas();
  const relief = canvas();
  const c = colour.getContext('2d')!;
  const r = relief.getContext('2d')!;
  const rand = seeded(11);

  // Ground: the woven blocks of aida, with the holes between them.
  c.fillStyle = rgb(FABRIC.hole);
  c.fillRect(0, 0, SIZE, SIZE);
  r.fillStyle = '#141414';
  r.fillRect(0, 0, SIZE, SIZE);
  for (let y = 0; y < CELLS; y++) {
    for (let x = 0; x < CELLS; x++) {
      const k = 0.88 + rand() * 0.22;
      const px = x * CELL, py = y * CELL;
      // Each block is a little bundle of warp and weft threads.
      c.fillStyle = rgb(FABRIC.ground, k);
      c.fillRect(px + 1.6, py + 1.6, CELL - 3.2, CELL - 3.2);
      c.fillStyle = rgb(FABRIC.ground, k * 1.18, 0.55);
      c.fillRect(px + 2.2, py + 4, CELL - 4.4, 2.2);
      c.fillRect(px + 2.2, py + 9.5, CELL - 4.4, 2.2);
      c.fillStyle = rgb(FABRIC.ground, k * 0.82, 0.5);
      c.fillRect(px + 6.8, py + 2.2, 2.2, CELL - 4.4);
      const g = 120 + rand() * 50;
      r.fillStyle = `rgb(${g},${g},${g})`;
      r.fillRect(px + 1.6, py + 1.6, CELL - 3.2, CELL - 3.2);
    }
  }

  // Dye mottling, so the repeat doesn't read as a grid from afar.
  for (let i = 0; i < 30; i++) {
    const x = rand() * SIZE, y = rand() * SIZE, rad = 60 + rand() * 180;
    const dark = rand() < 0.6;
    for (const [ox, oy] of [[0, 0], [SIZE, 0], [-SIZE, 0], [0, SIZE], [0, -SIZE]]) {
      const grad = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      grad.addColorStop(0, dark ? 'rgba(20,4,2,0.22)' : 'rgba(255,200,170,0.06)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = grad;
      c.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }

  // Cross-stitches. Border cells are drawn again on the far side so the tile wraps.
  const cross = (ctx: CanvasRenderingContext2D, px: number, py: number, style: string, lit?: string) => {
    const inset = 2.4;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4.2;
    ctx.strokeStyle = style;
    ctx.beginPath();
    ctx.moveTo(px + inset, py + CELL - inset); ctx.lineTo(px + CELL - inset, py + inset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + inset, py + inset); ctx.lineTo(px + CELL - inset, py + CELL - inset);
    ctx.stroke();
    if (lit) {
      // A glint along the top stitch, where the thread twists.
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = lit;
      ctx.beginPath();
      ctx.moveTo(px + inset + 1.5, py + inset + 0.5); ctx.lineTo(px + CELL - inset - 0.5, py + CELL - inset - 1.5);
      ctx.stroke();
    }
  };
  for (const [x, y, style] of pattern()) {
    const wrapX = x === 0 ? [SIZE] : x === CELLS - 1 ? [-SIZE] : [];
    const wrapY = y === 0 ? [SIZE] : y === CELLS - 1 ? [-SIZE] : [];
    for (const ox of [0, ...wrapX]) {
      for (const oy of [0, ...wrapY]) {
        const px = x * CELL + ox, py = y * CELL + oy;
        cross(c, px + 0.6, py + 0.9, 'rgba(20,5,2,0.45)');
        cross(c, px, py, style, 'rgba(255,255,255,0.35)');
        cross(r, px, py, '#ffffff');
      }
    }
  }

  cache = { colour, relief };
  return cache;
}

let tileURL: string | null = null;
// A small JPEG of the cloth for CSS backgrounds (the footer valance).
export function fabricURL() {
  if (!tileURL) {
    const small = document.createElement('canvas');
    small.width = small.height = 256;
    small.getContext('2d')!.drawImage(makeFabric().colour, 0, 0, 256, 256);
    tileURL = small.toDataURL('image/jpeg', 0.9);
  }
  return tileURL;
}
