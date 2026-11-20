import type { CSSProperties } from 'react';
import type { Look } from './logic';

/**
 * Brush's own light and dark looks: the site's colour tokens (RGB triplets), set on the
 * screen's wrapper so everything inside (cards, text, buttons) follows. Light is bright and
 * soft, with white cards, like a phone app's; dark is the site's own palette.
 */
const LIGHT: Record<string, string> = {
  '--bg': '244 245 248',
  '--surface': '255 255 255',
  '--surface-2': '240 242 246',
  '--raised': '255 255 255',
  '--line': '226 230 237',
  '--line-strong': '204 211 222',
  '--ink': '22 24 35',
  '--ink-muted': '84 92 110',
  '--ink-faint': '120 128 145',
  '--accent': '55 85 140',
  '--accent-strong': '58 88 145',
  '--accent-ink': '245 247 250',
  '--ok': '46 132 84',
  '--warn': '142 98 24',
  '--bad': '196 52 70',
};
const DARK: Record<string, string> = {
  '--bg': '18 23 32',
  '--surface': '22 28 39',
  '--surface-2': '29 36 49',
  '--raised': '33 41 56',
  '--line': '40 49 66',
  '--line-strong': '56 67 87',
  '--ink': '220 226 235',
  '--ink-muted': '156 167 185',
  '--ink-faint': '122 134 153',
  '--accent': '140 165 214',
  '--accent-strong': '76 103 152',
  '--accent-ink': '238 242 248',
  '--ok': '130 174 145',
  '--warn': '207 172 112',
  '--bad': '216 131 131',
};

/** Whether the screen is light, for a saved look ('site' follows the site's theme). */
export function isLight(look: Look | undefined): boolean {
  const l = look ?? 'light';
  if (l === 'site') return document.documentElement.classList.contains('light');
  return l === 'light';
}

/** The CSS variables for the screen's wrapper. */
export const themeVars = (light: boolean) => (light ? LIGHT : DARK) as CSSProperties;

/** The page colour of a look, as a hex colour (for mixing the hero into it). */
export const pageColour = (light: boolean) => (light ? '#f4f5f8' : '#121720');

/** Mix two hex colours: `amount` 0 is `a`, 1 is `b`. */
export function mix(a: string, b: string, amount: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a);
  const y = p(b);
  return `#${x
    .map((v, i) =>
      Math.round(v + ((y[i] ?? 0) - v) * amount)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}
