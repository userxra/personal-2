import type { Mood, StageId } from './logic';

/**
 * Molar's pictures, drawn as SVG markup from constants only (never from saved data). One
 * function draws every form and mood; `Molar.tsx` puts the result on screen. All ids start
 * with the caller's prefix, so any number of Molars can share a page.
 */

/** The flame by the streak number: it climbs through colours as the streak grows. */
export type FlameTier =
  'spark' | 'orange' | 'red' | 'magenta' | 'gold' | 'crystal' | 'grey' | 'frost';

interface Look {
  scale?: number;
  mat?: 'milk' | 'gold' | 'diamond';
  baby?: boolean;
  arms?: boolean;
  hold?: 'brush' | 'sceptre';
  tuft?: readonly [number, number];
  sport?: boolean;
  fire?: boolean;
  royal?: boolean;
  crown?: boolean;
  cape?: boolean;
  laurel?: boolean;
  podium?: boolean;
  tiara?: boolean;
  shards?: boolean;
  /** Soft light behind him. */
  glow: string;
  /** The app icon's colour: the form's own colour. */
  icon: string;
}

export const LOOKS: Record<StageId, Look> = {
  milk: { scale: 0.62, mat: 'milk', baby: true, glow: '#7fe3cb', icon: '#5ccfb2' },
  little: { scale: 0.8, baby: true, arms: true, hold: 'brush', glow: '#8fd0ff', icon: '#5ab5f2' },
  molar: { arms: true, tuft: [24, 36], glow: '#ffc65a', icon: '#ffb020' },
  athlete: { arms: true, hold: 'brush', sport: true, glow: '#ff9d4a', icon: '#ff8a2a' },
  blazing: { arms: true, tuft: [40, 62], fire: true, glow: '#ff6a1a', icon: '#f2483a' },
  royal: {
    arms: true,
    crown: true,
    cape: true,
    hold: 'sceptre',
    royal: true,
    glow: '#ff3d9a',
    icon: '#e0469f',
  },
  golden: { arms: true, mat: 'gold', laurel: true, podium: true, glow: '#ffd96a', icon: '#f0a400' },
  diamond: {
    arms: true,
    mat: 'diamond',
    tiara: true,
    shards: true,
    glow: '#b8a4ff',
    icon: '#9a7cff',
  },
};

const TOOTH =
  'M70 48C52 48 40 62 40 82C40 104 46 120 52 134C56 146 58 160 62 172C64 180 76 182 80 174C84 164 88 152 100 152C112 152 116 164 120 174C124 182 136 180 138 172C142 160 144 146 148 134C154 120 160 104 160 82C160 62 148 48 130 48C118 48 112 56 100 56C88 56 82 48 70 48Z';
const INK = '#232a3a';

/** The box a full character is drawn in, with room for flames and crowns. */
export const VIEWBOX = '-8 -18 216 216';
/** The app icon's crop: the character a little smaller than the icon, like a mascot app's. */
export function iconViewBox(stage: StageId): string {
  const l = LOOKS[stage];
  const top = l.crown || l.tiara ? 2 : l.tuft ? 10 : 26;
  return `20 ${top} 160 160`;
}

type Stop = readonly [number, string, number?];
type Tri = readonly [
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
];

const f1 = (n: number) => +n.toFixed(1);
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const stops = (list: readonly Stop[]) =>
  list
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('');
const radial = (
  id: string,
  cx: number,
  cy: number,
  r: number,
  list: readonly Stop[],
  user = true,
) =>
  `<radialGradient id="${id}" ${user ? 'gradientUnits="userSpaceOnUse"' : ''} cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`;
const linear = (
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  list: readonly Stop[],
) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;
const sparkle = (x: number, y: number, r: number, c: string, o = 1) =>
  `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${c}" opacity="${o}"/>`;
const snow = (x: number, y: number, r: number) =>
  `<g stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".95">${[0, 60, 120].map((a) => `<path d="M${x} ${y - r}V${y + r}" transform="rotate(${a} ${x} ${y})"/>`).join('')}</g>`;
const ring = (x: number, y: number, r: number, c: string) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="1.6"/><circle cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 0.35)}" r="1.1" fill="#fff"/>`;
const goldLeaf = (id: string) =>
  linear(id, 0, 0, 1, 1, [
    [0, '#fff3b0'],
    [0.45, '#ffcf3a'],
    [1, '#f0960c'],
  ]);

// ---------- Flames ----------

interface FlamePal {
  o: readonly [string, string];
  m: readonly [string, string];
  i: readonly [string, string];
}
const FIRE: FlamePal = {
  o: ['#ffa12e', '#ff3d1f'],
  m: ['#ffe066', '#ff8a24'],
  i: ['#ffffff', '#fff0a0'],
};
const TIERS: Record<FlameTier, FlamePal> = {
  spark: { o: ['#ffc21a', '#ff8a00'], m: ['#ffe680', '#ffb300'], i: ['#ffffff', '#fff6c8'] },
  orange: { o: ['#ff9a1f', '#ff5200'], m: ['#ffd36a', '#ff8a1f'], i: ['#ffffff', '#ffefc0'] },
  red: { o: ['#ff6a3d', '#e3162c'], m: ['#ffb08a', '#ff4a3a'], i: ['#ffffff', '#ffe0d6'] },
  magenta: { o: ['#ff7ad0', '#cf1395'], m: ['#ffc2e8', '#ff4fb8'], i: ['#ffffff', '#ffe6f5'] },
  gold: { o: ['#ffe885', '#f5a300'], m: ['#fff8d0', '#ffd23f'], i: ['#ffffff', '#ffffff'] },
  crystal: { o: ['#d9ccff', '#7b5cff'], m: ['#f1ecff', '#b7a2ff'], i: ['#ffffff', '#ffffff'] },
  grey: { o: ['#a3acbb', '#5d6678'], m: ['#d3d9e2', '#8a94a6'], i: ['#ffffff', '#eef1f5'] },
  frost: { o: ['#d6ecfb', '#8fb3d6'], m: ['#f4fbff', '#bcd8ee'], i: ['#ffffff', '#ffffff'] },
};
interface FlameSpec {
  x: number;
  b: number;
  w: number;
  h: number;
  l: number;
}
const AURA: FlameSpec[] = [
  { x: 100, b: 126, w: 150, h: 118, l: 4 },
  { x: 52, b: 150, w: 70, h: 128, l: -16 },
  { x: 148, b: 150, w: 70, h: 128, l: 16 },
  { x: 28, b: 178, w: 40, h: 84, l: -14 },
  { x: 172, b: 178, w: 40, h: 84, l: 14 },
];

function flamePath(x: number, b: number, w: number, h: number, l: number) {
  const r = w / 2;
  return `M${f1(x - r)} ${f1(b)}C${f1(x - r)} ${f1(b - h * 0.45)} ${f1(x - w * 0.08 + l * 0.3)} ${f1(b - h * 0.62)} ${f1(x + l)} ${f1(b - h)}C${f1(x + w * 0.18 + l * 0.5)} ${f1(b - h * 0.62)} ${f1(x + r)} ${f1(b - h * 0.45)} ${f1(x + r)} ${f1(b)}C${f1(x + r)} ${f1(b + w * 0.32)} ${f1(x - r)} ${f1(b + w * 0.32)} ${f1(x - r)} ${f1(b)}Z`;
}
const flameDefs = (P: string, p: FlamePal) =>
  linear(`${P}-fo`, 0, 1, 0, 0, [
    [0, p.o[0]],
    [1, p.o[1]],
  ]) +
  linear(`${P}-fm`, 0, 1, 0, 0, [
    [0, p.m[0]],
    [1, p.m[1]],
  ]) +
  linear(`${P}-fi`, 0, 1, 0, 0, [
    [0, p.i[0]],
    [1, p.i[1]],
  ]);
function flame(P: string, { x, b, w, h, l }: FlameSpec, delay: number | null = 0) {
  const anim = delay === null ? '' : ` class="molar-fl" style="animation-delay:${-delay}s"`;
  return `<g${anim}><path d="${flamePath(x, b, w, h, l)}" fill="url(#${P}-fo)"/><path d="${flamePath(x, b + w * 0.04, w * 0.66, h * 0.72, l * 0.7)}" fill="url(#${P}-fm)"/><path d="${flamePath(x, b + w * 0.06, w * 0.36, h * 0.44, l * 0.5)}" fill="url(#${P}-fi)"/></g>`;
}

/** The streak flame, in a 32 x 36 box. */
export function flameMarkup(tier: FlameTier, P: string): string {
  const f = { x: 16, b: 27, w: 22, h: 24, l: 1.5 };
  let extra = '';
  if (tier === 'gold')
    extra = `<path d="${flamePath(f.x, f.b, f.w, f.h, f.l)}" fill="none" stroke="#e08a00" stroke-width=".9"/><path d="M8.6 22C8.4 17.5 10.6 13.4 13.6 10.6" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".95"/>${sparkle(26, 7, 3.6, '#ffffff')}${sparkle(5, 12, 2.2, '#fff3b0')}`;
  if (tier === 'crystal')
    extra = `<clipPath id="${P}-x"><path d="${flamePath(f.x, f.b, f.w, f.h, f.l)}"/></clipPath><g clip-path="url(#${P}-x)" stroke="#ffffff" stroke-width=".8" opacity=".8" fill="none"><path d="M17.5 3L11 16L16 33M17.5 3L22 15L16 33M5 22L11 16L22 15L27 23"/></g>${sparkle(26, 7, 3.6, '#ffffff')}${sparkle(5, 13, 2.2, '#e8e0ff')}`;
  return `<defs>${flameDefs(P, TIERS[tier])}</defs>${flame(P, f, null)}${extra}`;
}

// ---------- Materials ----------

const ENAMEL: readonly Stop[] = [
  [0, '#ffffff'],
  [0.45, '#f4f7fb'],
  [0.8, '#d8e0eb'],
  [1, '#b8c5d7'],
];
const MILK: readonly Stop[] = [
  [0, '#fffefa'],
  [0.45, '#fdf6ea'],
  [0.8, '#f0e2cb'],
  [1, '#d9c6a6'],
];
/** Clean gold: warm yellows into saturated orange, never brown or olive. */
const GOLD: readonly Stop[] = [
  [0, '#fffef5'],
  [0.18, '#fff3b0'],
  [0.42, '#ffdc4f'],
  [0.72, '#ffc61f'],
  [1, '#f6a90f'],
];

/**
 * Molar: inner SVG markup for a 200 x 200 box (show it with `VIEWBOX`, or `iconViewBox` for
 * the icon). `icon` leaves out the scenery and draws him full size; `ghost` draws a form not
 * reached yet: only its outline, no scenery.
 */
export function molarMarkup(
  stage: StageId,
  mood: Mood,
  P: string,
  icon = false,
  ghost = false,
): string {
  const S = LOOKS[stage];
  const mat = S.mat ?? 'enamel';
  const baby = !!S.baby;
  const defs: string[] = [];
  const back: string[] = [];
  const under: string[] = [];
  const body: string[] = [];
  const after: string[] = [];

  defs.push(`<clipPath id="${P}-c"><path d="${TOOTH}"/></clipPath>`);
  for (const [n, sd] of [
    [1, 1.2],
    [2, 2],
    [3, 3],
    [8, 8],
  ] as const)
    defs.push(
      `<filter id="${P}-b${n}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`,
    );
  if (mat === 'gold') defs.push(radial(`${P}-body`, 76, 64, 132, GOLD));
  else if (mat === 'diamond')
    defs.push(
      radial(`${P}-body`, 78, 70, 125, [
        [0, '#ffffff'],
        [0.5, '#d9f1ff'],
        [1, '#8fc4ef'],
      ]),
    );
  else defs.push(radial(`${P}-body`, 80, 70, 122, mat === 'milk' ? MILK : ENAMEL));
  const aoC = mat === 'gold' ? '#e08600' : '#24385a';
  defs.push(
    radial(`${P}-ao`, 82, 72, 120, [
      [0.5, aoC, 0],
      [1, aoC, 0.26],
    ]),
  );
  defs.push(
    radial(
      `${P}-scl`,
      0.42,
      0.36,
      0.7,
      [
        [0, '#ffffff'],
        [0.7, '#f3f6fa'],
        [1, '#d3dbe7'],
      ],
      false,
    ),
  );
  defs.push(
    radial(
      `${P}-pup`,
      0.4,
      0.35,
      0.75,
      [
        [0, '#4b5876'],
        [1, '#111724'],
      ],
      false,
    ),
  );
  const ex = baby ? 13.5 : 12;
  const ey = baby ? 15.5 : 14;
  defs.push(
    `<clipPath id="${P}-el"><ellipse cx="80" cy="96" rx="${ex}" ry="${ey}"/></clipPath><clipPath id="${P}-er"><ellipse cx="120" cy="96" rx="${ex}" ry="${ey}"/></clipPath>`,
  );

  // ---------- Scenery (not on the icon or an outline) ----------
  if (!icon && !ghost) {
    defs.push(
      radial(`${P}-glow`, 100, 104, 96, [
        [0, S.glow, 0.45],
        [0.6, S.glow, 0.14],
        [1, S.glow, 0],
      ]),
    );
    back.push(`<circle cx="100" cy="104" r="96" fill="url(#${P}-glow)"/>`);

    if (S.sport) {
      back.push(
        `<g fill="none" stroke-linecap="round"><ellipse cx="100" cy="172" rx="94" ry="20" stroke="#e8564a" stroke-width="10" opacity=".9"/><ellipse cx="100" cy="172" rx="94" ry="20" stroke="#ffffff" stroke-width="1.4" stroke-dasharray="7 6" opacity=".8"/></g>`,
      );
      back.push(
        `<g stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" opacity=".55"><path d="M2 76H30"/><path d="M8 92H34"/><path d="M0 108H26"/><path d="M170 66H196"/><path d="M174 82H200"/></g>`,
      );
    }
    if (S.fire) {
      defs.push(flameDefs(P, FIRE));
      defs.push(
        `<clipPath id="${P}-top"><rect x="-20" y="-40" width="240" height="178"/></clipPath>`,
      );
      AURA.forEach((f, i) =>
        back.push(
          i === 0 ? `<g clip-path="url(#${P}-top)">${flame(P, f, 0)}</g>` : flame(P, f, i * 0.37),
        ),
      );
      const rnd = rng(77);
      let em = '';
      for (let i = 0; i < 16; i++) {
        const x = 14 + rnd() * 172;
        const y = -6 + rnd() * 120;
        if (x > 52 && x < 148 && y > 40) continue;
        em += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.9 + rnd() * 1.9)}" fill="#ffd166" opacity="${f1(0.55 + rnd() * 0.45)}"/>`;
      }
      back.push(em);
    }
    if (S.royal) {
      const burst = (n: number, ro: number, ri: number, rot: number) => {
        let d = '';
        for (let i = 0; i < n * 2; i++) {
          const ang = rot + (i / (n * 2)) * Math.PI * 2;
          const r = i % 2 ? ri : ro;
          d += `${i ? 'L' : 'M'}${f1(100 + r * Math.cos(ang))} ${f1(98 + r * Math.sin(ang))}`;
        }
        return d + 'Z';
      };
      defs.push(
        radial(`${P}-rb1`, 100, 98, 104, [
          [0, '#ffd6ee', 1],
          [0.6, '#ff4fb0', 1],
          [0.9, '#e0359f', 0.85],
          [1, '#c0157a', 0],
        ]),
      );
      defs.push(
        radial(`${P}-rb2`, 100, 98, 74, [
          [0, '#ffffff', 1],
          [0.6, '#ffb3e0', 0.95],
          [1, '#ff6fbf', 0.35],
        ]),
      );
      back.push(
        `<circle cx="100" cy="98" r="92" fill="#ff3d9a" opacity=".35" filter="url(#${P}-b8)"/><path d="${burst(16, 104, 66, -Math.PI / 2)}" fill="url(#${P}-rb1)"/><path d="${burst(16, 74, 48, -Math.PI / 2 + Math.PI / 16)}" fill="url(#${P}-rb2)"/>`,
      );
      back.push(
        sparkle(22, 40, 6, '#ffd1ec'),
        sparkle(180, 52, 5, '#ffffff'),
        sparkle(170, 150, 4, '#ffd1ec'),
        sparkle(30, 112, 4, '#ffffff', 0.85),
      );
    }
    if (S.cape) {
      defs.push(
        linear(`${P}-cape`, 0, 0, 1, 1, [
          [0, '#ef3b6a'],
          [0.6, '#b0103f'],
          [1, '#6e0826'],
        ]),
      );
      back.push(
        `<path d="M60 88C40 118 28 156 22 184Q40 176 56 186Q78 176 100 188Q122 176 144 186Q160 176 178 184C172 156 160 118 140 88Z" fill="url(#${P}-cape)"/>`,
      );
      let spots = '';
      for (let x = 30; x <= 170; x += 14)
        spots += `<path d="M${x} ${183 + (x % 28 ? 1 : 0)}l-1.6 4h3.2z" fill="#20202a"/>`;
      back.push(
        `<path d="M20 180Q40 172 56 182Q78 172 100 184Q122 172 144 182Q160 172 180 180L180 190Q160 182 144 192Q122 182 100 194Q78 182 56 192Q40 182 20 190Z" fill="#fbf7ef"/>${spots}`,
      );
    }
    if (mat === 'gold') {
      let r = '';
      for (let i = 0; i < 18; i++) {
        const a0 = (i / 18) * Math.PI * 2;
        const a1 = a0 + Math.PI / 30;
        r += `<path d="M100 96L${f1(100 + 104 * Math.cos(a0))} ${f1(96 + 104 * Math.sin(a0))}L${f1(100 + 104 * Math.cos(a1))} ${f1(96 + 104 * Math.sin(a1))}Z"/>`;
      }
      defs.push(
        radial(`${P}-rm`, 100, 96, 104, [
          [0.3, '#fff', 1],
          [1, '#fff', 0],
        ]) + `<mask id="${P}-rmask"><circle cx="100" cy="96" r="104" fill="url(#${P}-rm)"/></mask>`,
      );
      back.push(`<g fill="#ffc94a" opacity=".38" mask="url(#${P}-rmask)">${r}</g>`);
    }
    if (S.shards) {
      defs.push(
        linear(`${P}-aur`, 0, 0, 1, 0, [
          [0, '#ffb3e0'],
          [0.33, '#c9b6ff'],
          [0.66, '#8fdcff'],
          [1, '#a6f5d8'],
        ]),
      );
      back.push(
        `<circle cx="100" cy="98" r="84" fill="none" stroke="url(#${P}-aur)" stroke-width="12" opacity=".55" filter="url(#${P}-b3)"/>`,
      );
      const shard = (x: number, y: number, s: number, rot: number) =>
        `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 -14L6 -6L6 8L0 14L-6 8L-6 -6Z" fill="#dff4ff"/><path d="M0 -14L6 -6L6 8L0 14Z" fill="#8fc9f5"/><path d="M0 -14L-6 -6L0 -2L6 -6Z" fill="#ffffff"/><path d="M0 -14L6 -6L6 8L0 14L-6 8L-6 -6Z" fill="none" stroke="#ffffff" stroke-width=".9"/></g>`;
      back.push(
        shard(26, 52, 1.1, -24),
        shard(176, 64, 0.9, 20),
        shard(18, 128, 0.75, 14),
        shard(184, 138, 1.05, -16),
        shard(46, 10, 0.6, 30),
        shard(158, 6, 0.7, -30),
      );
    }
    if (stage === 'milk')
      back.push(
        ring(42, 120, 6, '#9fe3d2'),
        ring(156, 104, 5, '#9fe3d2'),
        ring(150, 138, 3.5, '#9fe3d2'),
        ring(36, 92, 3, '#9fe3d2'),
      );
    if (stage === 'little')
      back.push(
        ring(34, 70, 5, '#a8dcff'),
        ring(170, 52, 4, '#a8dcff'),
        ring(26, 140, 3.5, '#a8dcff'),
        sparkle(162, 152, 5, '#ffffff', 0.8),
      );
    if (stage === 'molar')
      back.push(
        sparkle(150, 40, 5, '#ffd36e'),
        sparkle(40, 60, 4, '#ffb37a'),
        sparkle(166, 150, 3.5, '#ffd36e', 0.8),
      );

    if (S.podium) {
      defs.push(
        linear(`${P}-pod`, 0, 0, 0, 1, [
          [0, '#ffffff'],
          [1, '#d9e0ea'],
        ]),
      );
      defs.push(goldLeaf(`${P}-pt`));
      under.push(
        `<path d="M44 178H156L152 198H48Z" fill="url(#${P}-pod)"/><rect x="40" y="174" width="120" height="7" rx="3.5" fill="url(#${P}-pt)"/><path d="M100 184l2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z" fill="url(#${P}-pt)"/><ellipse cx="100" cy="176" rx="44" ry="3.5" fill="#b3600a" opacity=".35" filter="url(#${P}-b2)"/>`,
      );
    } else {
      under.push(
        `<ellipse cx="100" cy="186" rx="${stage === 'milk' ? 34 : 50}" ry="6" fill="#000" opacity=".28" filter="url(#${P}-b3)"/>`,
      );
    }
  }

  // ---------- Arms and what he holds ----------
  const armFill = `url(#${P}-body)`;
  const holding = !!S.hold && !icon;
  if (S.arms) {
    body.push(
      `<ellipse cx="42" cy="120" rx="9" ry="13" transform="rotate(28 42 120)" fill="${armFill}"/>`,
    );
    if (!holding)
      body.push(
        `<ellipse cx="158" cy="120" rx="9" ry="13" transform="rotate(-28 158 120)" fill="${armFill}"/>`,
      );
  }
  if (holding && S.hold === 'brush') {
    defs.push(
      linear(`${P}-hd`, 0, 0, 1, 0, [
        [0, '#6aa8ff'],
        [0.5, '#2f74e6'],
        [1, '#1a4fb0'],
      ]),
    );
    const bristles = [0, 1, 2, 3, 4, 5]
      .map(
        (i) =>
          `<rect x="-14" y="${-38 + i * 4.6}" width="10" height="3.6" rx="1.6" fill="${i % 2 ? '#7fe3d0' : '#f4fbff'}"/>`,
      )
      .join('');
    body.push(
      `<g transform="translate(166 104) rotate(18)"><rect x="-4.5" y="-6" width="9" height="56" rx="4.5" fill="url(#${P}-hd)"/><rect x="-5" y="-40" width="10" height="36" rx="4" fill="url(#${P}-hd)"/>${bristles}<path d="M-15 -40c-4-2-3-7 1-7 0-4 5-5 7-2 3-2 7 0 6 4 3 1 2 6-1 6z" fill="#ffffff"/><path d="M-12 -43c2-1 4 0 6 0" stroke="#7fe3d0" stroke-width="2" stroke-linecap="round" fill="none"/></g>`,
    );
  }
  if (holding && S.hold === 'sceptre') {
    defs.push(goldLeaf(`${P}-sc`));
    defs.push(
      radial(
        `${P}-orb`,
        0.35,
        0.3,
        0.8,
        [
          [0, '#ffc2cc'],
          [0.45, '#e8233f'],
          [1, '#7a0717'],
        ],
        false,
      ),
    );
    body.push(
      `<g transform="translate(166 104) rotate(14)"><rect x="-3.5" y="-30" width="7" height="82" rx="3.5" fill="url(#${P}-sc)"/><rect x="-6" y="-26" width="12" height="5" rx="2.5" fill="url(#${P}-sc)"/><circle cx="0" cy="-38" r="10" fill="url(#${P}-orb)"/><circle cx="-3.5" cy="-41.5" r="2.6" fill="#fff" opacity=".9"/>${sparkle(9, -50, 5, '#ffffff')}</g>`,
    );
  }
  if (holding)
    body.push(
      `<ellipse cx="160" cy="114" rx="9.5" ry="11" transform="rotate(-20 160 114)" fill="${armFill}"/>`,
    );

  // ---------- Body ----------
  body.push(`<path d="${TOOTH}" fill="url(#${P}-body)"/>`);
  if (mat === 'diamond') body.push(facets(P));
  body.push(`<path d="${TOOTH}" fill="url(#${P}-ao)"/>`);
  if (mat === 'diamond')
    body.push(
      `<ellipse cx="100" cy="108" rx="42" ry="30" fill="#f4fbff" opacity=".85" filter="url(#${P}-b8)" clip-path="url(#${P}-c)"/>`,
    );
  if ((S.fire || S.royal) && !icon)
    body.push(
      `<path d="${TOOTH}" fill="none" stroke="${S.royal ? '#ff4fae' : '#ff7a1a'}" stroke-width="${S.royal ? 9 : 7}" opacity="${S.royal ? 0.7 : 0.55}" clip-path="url(#${P}-c)" filter="url(#${P}-b3)"/>`,
    );
  if (mat === 'gold') {
    // Polished metal: a soft shadow side, a lit edge and warm light bounced back on the far edge.
    defs.push(
      `<mask id="${P}-cres"><path d="${TOOTH}" fill="#fff"/><path d="${TOOTH}" transform="translate(-9 -10) scale(1.02)" fill="#000" filter="url(#${P}-b3)"/></mask>`,
    );
    defs.push(
      linear(`${P}-rm2`, 0, 0, 1, 1, [
        [0, '#000'],
        [0.55, '#000'],
        [0.75, '#fff'],
      ]) +
        `<mask id="${P}-bounce"><rect x="0" y="0" width="200" height="200" fill="url(#${P}-rm2)"/></mask>`,
    );
    defs.push(
      linear(`${P}-em`, 0, 0, 1, 1, [
        [0, '#fff'],
        [0.45, '#fff'],
        [0.62, '#000'],
      ]) +
        `<mask id="${P}-edge"><rect x="0" y="0" width="200" height="200" fill="url(#${P}-em)"/></mask>`,
    );
    body.push(
      `<g clip-path="url(#${P}-c)"><path d="${TOOTH}" fill="#f5a000" opacity=".36" mask="url(#${P}-cres)" filter="url(#${P}-b1)"/><path d="M34 118L104 40L118 40L48 118Z" fill="#ffffff" opacity=".28" filter="url(#${P}-b2)"/><path d="M52 130L122 52L128 52L58 130Z" fill="#ffffff" opacity=".22" filter="url(#${P}-b1)"/><ellipse cx="128" cy="57" rx="13" ry="4" fill="#fffbea" opacity=".85" filter="url(#${P}-b1)"/><path d="M30 60C40 52 52 50 64 52" stroke="#fffbea" stroke-width="5" stroke-linecap="round" fill="none" opacity=".9" filter="url(#${P}-b1)"/></g><path d="${TOOTH}" fill="none" stroke="#fffbea" stroke-width="2.6" opacity=".95" mask="url(#${P}-edge)" clip-path="url(#${P}-c)"/><path d="${TOOTH}" fill="none" stroke="#ffe680" stroke-width="3.2" opacity=".9" mask="url(#${P}-bounce)" clip-path="url(#${P}-c)"/>`,
    );
  }
  const tint: Partial<Record<Mood, readonly [string, number]>> = {
    angry: ['#ff5a45', 0.16],
    furious: ['#ff3b2f', 0.3],
    frozen: mat === 'gold' ? ['#d6ecff', 0.62] : ['#8cc8ff', 0.4],
  };
  const t = tint[mood];
  if (t) body.push(`<path d="${TOOTH}" fill="${t[0]}" opacity="${t[1]}"/>`);
  const hl = mat === 'gold' ? '#fffdf0' : '#ffffff';
  const side =
    mat === 'gold'
      ? `<path d="M151 80C154 90 154 100 151 110" stroke="#fff" stroke-width="3.4" stroke-linecap="round" fill="none" opacity=".9"/><path d="M60 150C62 158 66 166 70 170" stroke="#fffbea" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".75"/>`
      : `<ellipse cx="146" cy="96" rx="4" ry="14" transform="rotate(8 146 96)" fill="${hl}" opacity=".45" filter="url(#${P}-b3)"/>`;
  body.push(
    `<g clip-path="url(#${P}-c)"><ellipse cx="66" cy="66" rx="20" ry="10" transform="rotate(-38 66 66)" fill="${hl}" opacity="${mat === 'gold' ? 0.95 : 0.85}" filter="url(#${P}-b3)"/><ellipse cx="60" cy="64" rx="6.5" ry="3.4" transform="rotate(-40 60 64)" fill="#fff"/>${side}</g>`,
  );
  body.push(
    `<path d="${TOOTH}" fill="none" stroke="${mat === 'gold' ? '#e69500' : '#2b3c5c'}" stroke-opacity="${mat === 'gold' ? 0.45 : 0.28}" stroke-width="1.6"/>`,
  );

  body.push(face(P, mood, baby, mat === 'gold'));

  // ---------- In front ----------
  if (S.sport) {
    defs.push(
      linear(`${P}-band`, 0, 0, 0, 1, [
        [0, '#ff6b76'],
        [1, '#c41c38'],
      ]),
    );
    after.push(
      `<g clip-path="url(#${P}-c)"><path d="M36 72Q100 52 164 72L164 84Q100 64 36 84Z" fill="url(#${P}-band)"/><path d="M36 77.5Q100 57.5 164 77.5" stroke="#fff" stroke-width="2.2" fill="none" opacity=".9"/></g><path d="M156 74q14 2 18 12q-10 -2 -16 -4zM156 78q10 8 8 20q-6 -8 -10 -14z" fill="url(#${P}-band)"/>`,
    );
    if (!icon) {
      after.push(
        `<g transform="rotate(28 42 120)"><rect x="33" y="122" width="18" height="6" rx="3" fill="url(#${P}-band)"/></g><g transform="rotate(-20 160 114)"><rect x="150.5" y="116" width="19" height="6" rx="3" fill="url(#${P}-band)"/></g>`,
      );
      defs.push(
        linear(`${P}-shoe`, 0, 0, 0, 1, [
          [0, '#ffffff'],
          [1, '#dfe5ee'],
        ]),
      );
      const shoe = (mirror: boolean) =>
        `<g ${mirror ? 'transform="translate(200 0) scale(-1 1)"' : ''}><path d="M54 182Q54 168 68 167L80 167Q90 168 91 177L91 183Q72 187 54 183Z" fill="url(#${P}-shoe)"/><path d="M53 181H92V185Q72 189 53 185Z" fill="#3a4a66"/><path d="M62 175L72 169M68 177L78 171" stroke="#e8394a" stroke-width="2.6" stroke-linecap="round"/></g>`;
      after.push(
        shoe(false),
        shoe(true),
        sparkle(30, 34, 5, '#ffffff', 0.9),
        sparkle(178, 30, 4, '#ffffff', 0.8),
      );
    }
  }
  if (S.tuft) {
    if (!(S.fire && !icon)) defs.push(flameDefs(P, FIRE));
    after.push(flame(P, { x: 100, b: 58, w: S.tuft[0], h: S.tuft[1], l: 6 }, icon ? null : 0.2));
  }
  if (S.crown) after.push(crown(P));
  if (S.laurel) after.push(laurel(P));
  if (S.tiara) after.push(tiara(P));
  if (!icon && S.shards)
    after.push(
      sparkle(32, 30, 8, '#ffffff'),
      sparkle(174, 112, 6, '#e3f6ff'),
      sparkle(150, 26, 4.5, '#ffe3f4'),
      sparkle(24, 156, 4.5, '#ffffff', 0.8),
    );
  if (mat === 'gold')
    after.push(sparkle(134, 68, 6, '#ffffff'), sparkle(60, 134, 4, '#ffffff', 0.95));
  if (!icon && mat === 'gold')
    after.push(
      sparkle(156, 52, 7, '#ffffff'),
      sparkle(46, 150, 5, '#fffbe0'),
      sparkle(30, 40, 4, '#fffbe0', 0.9),
      sparkle(172, 128, 4, '#ffffff', 0.85),
    );
  if (!icon && S.royal)
    after.push(
      `<g transform="translate(30 52) rotate(-15)"><path d="M0 -7L6 0L0 9L-6 0Z" fill="#7cc4ff" stroke="#fff" stroke-width=".8"/></g><g transform="translate(26 150) rotate(12)"><path d="M0 -6L5 0L0 8L-5 0Z" fill="#ff7eb6" stroke="#fff" stroke-width=".8"/></g>`,
    );

  // ---------- Mood extras ----------
  if (mood === 'worried') {
    defs.push(
      linear(`${P}-drop`, 0, 0, 0, 1, [
        [0, '#d9f4ff'],
        [1, '#3fa6ec'],
      ]),
    );
    after.push(
      `<path d="M150 62C154 70 158 74 158 80A8 8 0 0 1 142 80C142 74 146 70 150 62Z" fill="url(#${P}-drop)"/><ellipse cx="147" cy="78" rx="2" ry="3" fill="#fff" opacity=".9"/>`,
    );
  }
  if (mood === 'angry' || mood === 'furious') {
    after.push(
      `<g transform="translate(142 66)" stroke="#e8394a" stroke-width="3.2" stroke-linecap="round" fill="none">${[0, 90, 180, 270].map((a) => `<path d="M-8 -2.5Q-2.5 -2.5 -2.5 -8" transform="rotate(${a})"/>`).join('')}</g>`,
    );
    if (!icon && mood === 'furious')
      after.push(
        `<g fill="#f3f5f8" opacity=".85"><circle cx="34" cy="60" r="8"/><circle cx="26" cy="48" r="6"/><circle cx="36" cy="44" r="4.5"/><circle cx="166" cy="60" r="8"/><circle cx="174" cy="48" r="6"/><circle cx="164" cy="44" r="4.5"/></g>`,
      );
  }
  if (mood === 'frozen') {
    after.push(
      `<path d="M52 58Q62 44 80 52Q92 46 100 56Q110 46 122 52Q140 44 148 58Q136 64 122 58Q110 66 100 60Q88 66 78 58Q64 64 52 58Z" fill="#ffffff" opacity=".95"/><path d="M70 60l2 9 2-8M126 60l2 7 2-7" fill="#e6f6ff"/>`,
    );
    if (icon) after.push(snow(36, 40, 8), snow(170, 150, 6));
    else
      after.push(
        `<rect x="26" y="26" width="148" height="164" rx="16" fill="#bfe3ff" opacity=".2" stroke="#e6f6ff" stroke-opacity=".85" stroke-width="2.5"/><path d="M40 60L60 36M44 84L78 40" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>`,
        snow(18, 22, 7),
        snow(184, 150, 6),
        snow(176, 30, 5),
      );
  }
  if (!icon && mood === 'happy' && (stage === 'little' || stage === 'molar'))
    after.push(sparkle(158, 70, 6, '#ffd36e'));

  // Milk Tooth's foam, unscaled, in front of his feet.
  let foam = '';
  if (stage === 'milk' && !icon) {
    defs.push(
      radial(
        `${P}-bub`,
        0.38,
        0.32,
        0.7,
        [
          [0, '#ffffff'],
          [0.7, '#eefaf6'],
          [1, '#bfe9dd'],
        ],
        false,
      ),
    );
    const bubbles: [number, number, number][] = [
      [64, 178, 12],
      [80, 182, 14],
      [100, 184, 15],
      [120, 182, 14],
      [136, 178, 12],
      [72, 168, 9],
      [128, 168, 9],
      [52, 182, 8],
      [148, 182, 8],
    ];
    foam = bubbles
      .map(
        ([x, y, r]) =>
          `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${P}-bub)"/><circle cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 0.4)}" r="${f1(r * 0.22)}" fill="#fff"/>`,
      )
      .join('');
    foam += `<path d="M76 172q12 -6 24 0t24 0" stroke="#58d4b6" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>`;
  }

  let char = body.join('') + after.join('');
  const sc = icon ? 1 : (S.scale ?? 1);
  if (sc !== 1)
    char = `<g transform="translate(100 186) scale(${sc}) translate(-100 -186)">${char}</g>`;
  const all = `<defs>${defs.join('')}</defs>${back.join('')}${under.join('')}${char}${foam}`;
  if (!ghost) return all;
  // The outline: the shape grown a little, minus the shape, in the text colour; a faint fill.
  return `<defs><filter id="${P}-ghost" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="grown"/><feComposite in="grown" in2="SourceAlpha" operator="out" result="edge"/><feFlood flood-color="currentColor" flood-opacity=".6"/><feComposite in2="edge" operator="in" result="line"/><feFlood flood-color="currentColor" flood-opacity=".07"/><feComposite in2="SourceAlpha" operator="in" result="fill"/><feMerge><feMergeNode in="fill"/><feMergeNode in="line"/></feMerge></filter></defs><g filter="url(#${P}-ghost)">${all}</g>`;
}

/** The crystal body: a mesh of small triangles in blues with a few pinks, lit from the top left. */
function facets(P: string): string {
  const rnd = rng(365);
  const pts: [number, number][][] = [];
  for (let r = 0; r <= 9; r++) {
    const row: [number, number][] = [];
    for (let c = 0; c <= 9; c++) {
      const edge = r === 0 || r === 9 || c === 0 || c === 9;
      row.push([
        34 + c * 14.6 + (edge ? 0 : (rnd() - 0.5) * 9),
        42 + r * 16 + (edge ? 0 : (rnd() - 0.5) * 9),
      ]);
    }
    pts.push(row);
  }
  const at = (r: number, c: number) => pts[r]![c]!;
  const colour = (t: Tri) => {
    const cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
    const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
    const d = Math.hypot(cx - 74, cy - 68) / 130;
    const L = Math.max(70, Math.min(98, 98 - d * 26 + (rnd() - 0.5) * 12));
    const pink = rnd() < 0.13;
    const H = pink ? 300 + rnd() * 40 : 192 + rnd() * 34;
    return `hsl(${f1(H)} ${f1(pink ? 70 : 78 + rnd() * 20)}% ${f1(L)}%)`;
  };
  let tris = '';
  let lines = '';
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const a = at(r, c),
        b = at(r, c + 1),
        d = at(r + 1, c),
        e = at(r + 1, c + 1);
      const pair: Tri[] =
        (r + c) % 2
          ? [
              [a, b, e],
              [a, e, d],
            ]
          : [
              [a, b, d],
              [b, e, d],
            ];
      for (const t of pair) {
        const path = `M${t.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}Z`;
        tris += `<path d="${path}" fill="${colour(t)}"/>`;
        lines += `<path d="${path}"/>`;
      }
    }
  return `<g clip-path="url(#${P}-c)">${tris}<g stroke="#ffffff" stroke-opacity=".55" stroke-width=".8" fill="none">${lines}</g></g>`;
}

function face(P: string, mood: Mood, baby: boolean, gold: boolean): string {
  const s = (w = 4.2) =>
    `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const rx = baby ? 13.5 : 12;
  const ry = baby ? 15.5 : 14;
  const pr = baby ? 9 : 7.5;
  const eye = (cx: number, px = 0, py = 0) =>
    `<ellipse cx="${cx}" cy="96" rx="${rx}" ry="${ry}" fill="url(#${P}-scl)"/><circle cx="${cx + px}" cy="${97 + py}" r="${pr}" fill="url(#${P}-pup)"/><circle cx="${cx + px - 2.8}" cy="${93.6 + py}" r="${baby ? 3.4 : 2.8}" fill="#fff"/><circle cx="${cx + px + 2.6}" cy="${100.4 + py}" r="1.3" fill="#fff" opacity=".85"/>`;
  const lid = (clip: 'el' | 'er', cx: number, yl: number, yr: number) =>
    `<g clip-path="url(#${P}-${clip})"><path d="M${cx - 16} 74H${cx + 16}V${96 + yr}L${cx - 16} ${96 + yl}Z" fill="url(#${P}-body)"/><path d="M${cx - 16} ${96 + yl}L${cx + 16} ${96 + yr}" stroke="${INK}" stroke-width="3.2"/></g>`;
  const open = (px = 0, py = 0) => eye(80, px, py) + eye(120, px, py);
  const eyes: Record<Mood, string> = {
    hello: open(),
    happy: `<path d="M70 99Q80 86 90 99M110 99Q120 86 130 99" ${s(5)}/>`,
    frozen: `<path d="M70 95Q80 101 90 95M110 95Q120 101 130 95" ${s(4.6)}/>`,
    content: open(0, -2),
    waiting: open(0, 2) + lid('el', 80, -4, -4) + lid('er', 120, -4, -4),
    annoyed:
      open(4, 4) +
      lid('el', 80, 1, 1) +
      lid('er', 120, 1, 1) +
      `<path d="M68 76L90 78M110 78L132 76" ${s(4)}/>`,
    worried: open(0, -1) + `<path d="M68 80L90 74M132 80L110 74" ${s(4.2)}/>`,
    angry:
      open(0, 2) +
      lid('el', 80, -12, -3) +
      lid('er', 120, -3, -12) +
      `<path d="M66 72L91 81M134 72L109 81" ${s(5)}/>`,
    furious:
      open(0, 3) +
      lid('el', 80, -10, 2) +
      lid('er', 120, 2, -10) +
      `<path d="M64 70L92 82M136 70L108 82" ${s(5.4)}/>`,
  };
  const showBlush =
    mood === 'happy' ||
    mood === 'hello' ||
    mood === 'content' ||
    (baby && mood !== 'angry' && mood !== 'furious' && mood !== 'frozen');
  const bc = gold ? '#ff6a4d' : '#ff8fa8';
  const blush = showBlush
    ? `<ellipse cx="66" cy="117" rx="9" ry="5.5" fill="${bc}" opacity=".55" filter="url(#${P}-b3)"/><ellipse cx="134" cy="117" rx="9" ry="5.5" fill="${bc}" opacity=".55" filter="url(#${P}-b3)"/>`
    : '';
  const openMouth = (d: string, inside: string) =>
    `<defs><clipPath id="${P}-mo"><path d="${d}"/></clipPath></defs><path d="${d}" fill="#6e1e30"/><g clip-path="url(#${P}-mo)">${inside}</g><path d="${d}" ${s(3)}/>`;
  const mouths: Record<Mood, string> = {
    happy: openMouth(
      'M82 114Q100 142 118 114Q100 121 82 114Z',
      '<ellipse cx="100" cy="132" rx="10" ry="6" fill="#ff7e93"/>',
    ),
    hello: openMouth(
      'M89 117Q100 132 111 117Q100 121 89 117Z',
      '<ellipse cx="100" cy="128" rx="6" ry="4" fill="#ff7e93"/>',
    ),
    content: `<path d="M87 118Q100 130 113 118" ${s()}/>`,
    waiting: `<path d="M91 123H109" ${s()}/>`,
    annoyed: `<path d="M88 125Q94 120 100 123T112 122" ${s()}/>`,
    worried: `<path d="M86 125q3.5-4 7 0t7 0t7 0t7 0" ${s(3.6)}/>`,
    frozen: `<rect x="85" y="116" width="30" height="13" rx="4" fill="#ffffff" stroke="${INK}" stroke-width="3"/><path d="M85 122.5H115M92.5 116V129M100 116V129M107.5 116V129" stroke="${INK}" stroke-width="1.8"/>`,
    angry: `<path d="M86 128Q100 116 114 128" ${s(4.6)}/>`,
    furious: openMouth(
      'M82 132Q100 104 118 132Z',
      '<rect x="80" y="113" width="40" height="5" fill="#ffffff"/><ellipse cx="100" cy="134" rx="10" ry="6" fill="#ff7e93"/>',
    ),
  };
  return eyes[mood] + blush + mouths[mood];
}

const CROWN_SHAPE =
  'M72 62L72 52L69 26L79 42L85 19L93 38L100 10L107 38L115 19L121 42L131 26L128 52L128 62Q100 68 72 62Z';

function crown(P: string): string {
  const tips: [number, number][] = [
    [69, 26],
    [85, 19],
    [100, 10],
    [115, 19],
    [131, 26],
  ];
  return `<defs>${linear(`${P}-cr`, 0, 0, 0.6, 1, [
    [0, '#fff6c4'],
    [0.35, '#ffd23f'],
    [0.75, '#f6a313'],
    [1, '#e8860a'],
  ])}${radial(
    `${P}-ruby`,
    0.35,
    0.3,
    0.8,
    [
      [0, '#ffb3bd'],
      [0.4, '#e8233f'],
      [1, '#7a0717'],
    ],
    false,
  )}${radial(
    `${P}-saph`,
    0.35,
    0.3,
    0.8,
    [
      [0, '#bfe0ff'],
      [0.4, '#2f6fe0'],
      [1, '#0d2a80'],
    ],
    false,
  )}</defs><g transform="rotate(-6 100 50)"><path d="${CROWN_SHAPE}" fill="url(#${P}-cr)" stroke="#d97706" stroke-width="1.4" stroke-linejoin="round"/><path d="M72 52Q100 58 128 52L128 62Q100 68 72 62Z" fill="#f29a0e" opacity=".55"/>${tips.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#ffe27a" stroke="#d97706" stroke-width="1"/><circle cx="${x - 1}" cy="${y - 1.2}" r="1.1" fill="#fff"/>`).join('')}<ellipse cx="100" cy="59" rx="6" ry="4.6" fill="url(#${P}-ruby)"/><circle cx="85" cy="58" r="3.4" fill="url(#${P}-saph)"/><circle cx="115" cy="58" r="3.4" fill="url(#${P}-saph)"/><circle cx="98" cy="57.5" r="1.4" fill="#fff"/><path d="M78 46l5-18" stroke="#fffbe8" stroke-width="2.2" stroke-linecap="round" opacity=".9"/></g>`;
}

/** A green victory wreath: two branches from the temples meeting at the top of his head. */
function laurel(P: string): string {
  const leaf = (x: number, y: number, deg: number, len: number) =>
    `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(deg)})"><path d="M0 0Q${f1(len / 2)} -${f1(len * 0.36)} ${len} 0Q${f1(len / 2)} ${f1(len * 0.36)} 0 0Z" fill="url(#${P}-lf)"/><path d="M1.5 0H${f1(len - 2)}" stroke="#bff0b0" stroke-width=".9" opacity=".8"/></g>`;
  let out = '';
  for (const side of [-1, 1]) {
    const p0 = [100 + side * 57, 90] as const;
    const c = [100 + side * 50, 54] as const;
    const p1 = [100 + side * 8, 48] as const;
    const pt = (t: number): [number, number] => [
      (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
      (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
    ];
    out += `<path d="M${p0[0]} ${p0[1]}Q${c[0]} ${c[1]} ${p1[0]} ${p1[1]}" stroke="#2f7d3f" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < 6; i++) {
      const t = 0.06 + i * 0.165;
      const [x, y] = pt(t);
      const [x2, y2] = pt(t + 0.01);
      const ang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
      const len = 15 - i * 0.8;
      out += leaf(x, y, ang - 42, len) + leaf(x, y, ang + 42, len);
    }
    const [bx, by] = pt(0.5);
    out += `<circle cx="${f1(bx - side * 5)}" cy="${f1(by + 3)}" r="2.6" fill="#ffd23f" stroke="#e08a08" stroke-width=".6"/>`;
  }
  return `<defs>${linear(`${P}-lf`, 0, 0, 0, 1, [
    [0, '#8fe07a'],
    [0.55, '#4cb35c'],
    [1, '#2f8a45'],
  ])}</defs>${out}<circle cx="100" cy="50" r="3.4" fill="#ffd23f" stroke="#e08a08" stroke-width=".7"/>`;
}

function tiara(P: string): string {
  return `<defs>${linear(`${P}-ic`, 0, 0, 1, 1, [
    [0, '#ffffff'],
    [0.45, '#bfeaff'],
    [0.7, '#7cc9ff'],
    [1, '#e8d6ff'],
  ])}</defs><g transform="rotate(-6 100 50)"><path d="${CROWN_SHAPE}" fill="url(#${P}-ic)" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/><path d="M72 52L100 10L128 52M85 19L93 38M115 19L107 38M69 26L79 42M131 26L121 42" stroke="#ffffff" stroke-width="1" opacity=".8" fill="none"/><path d="M93 59L100 51L107 59L100 66Z" fill="#ffffff" stroke="#7cc9ff" stroke-width="1"/>${sparkle(100, 10, 6, '#ffffff')}${sparkle(131, 26, 4, '#ffffff')}</g>`;
}
