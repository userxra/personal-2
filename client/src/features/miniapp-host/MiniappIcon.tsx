import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import type { CSSProperties } from 'react';
import { cn } from '../../lib/cn';
import { appDataQuery } from './sdk/data';
import { useNow } from './sdk/dates';
import type { Glyph, MiniappDefinition } from './sdk/types';

/**
 * The squircle (a superellipse, n = 5) phone launchers use for app icons, in a 100 x 100 box.
 * Softer than a rounded square: the curve starts further from the corner.
 */
export const SQUIRCLE = (() => {
  const n = 5;
  const pts: string[] = [];
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = 50 + 50 * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = 50 + 50 * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
})();

/** The same shape as a CSS mask, for things that aren't SVG (folders, the opening animation). */
export const SQUIRCLE_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${SQUIRCLE}"/></svg>`,
)}") center / 100% 100% no-repeat`;

const SIZES = {
  xs: 'h-5 w-5',
  sm: 'h-9 w-9',
  md: 'h-[3.75rem] w-[3.75rem]',
  lg: 'h-[4.5rem] w-[4.5rem]',
  /** As large as its box (inside folders). */
  fill: 'h-full w-full',
} as const;

export interface IconLook {
  glyph: Glyph;
  /** The icon's colour (also `var(--icon-bg)` for glyph cut-outs). */
  background: string;
  /** Optional two-colour gradient, top left to bottom right, instead of the plain colour. */
  gradient?: readonly [string, string];
  /** Glyph colour (default white). */
  color?: string;
  /** The glyph is a whole picture, drawn edge to edge and cut to the squircle. */
  fill?: boolean;
}

type IconProps = IconLook & {
  size?: keyof typeof SIZES;
  className?: string;
  /** The app the icon belongs to: its `liveIcon`, if any, changes the picture with its data. */
  app?: MiniappDefinition;
};

/**
 * An app icon, like a phone's: a squircle in a clear colour (or a two-colour gradient), a large
 * glyph, no shadow and no bevel. A plain colour gets a faint light at the top so it doesn't look
 * printed; that's all the finish there is.
 */
export function MiniappIcon({ app, ...props }: IconProps) {
  return app?.liveIcon ? <LiveIcon app={app} {...props} /> : <StaticIcon {...props} />;
}

/** An icon worked out from its app's data (read through the same cache the app uses). */
function LiveIcon({ app, ...props }: IconProps & { app: MiniappDefinition }) {
  const q = useQuery(appDataQuery(app));
  const now = useNow();
  let live = null;
  if (q.isSuccess) {
    try {
      live = app.liveIcon!(q.data.data ?? app.initialData, now);
    } catch {
      // A broken live icon falls back to the usual one.
    }
  }
  return <StaticIcon {...props} {...live} />;
}

function StaticIcon({
  glyph: GlyphIcon,
  background,
  gradient,
  color = '#ffffff',
  fill,
  size = 'md',
  className,
}: Omit<IconProps, 'app'>) {
  const id = useId().replace(/:/g, '');
  const [from, to] = gradient ?? [`color-mix(in srgb, ${background} 86%, white)`, background];
  return (
    <span
      aria-hidden
      data-icon
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center',
        SIZES[size],
        className,
      )}
      style={{ color, '--icon-bg': background } as CSSProperties}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2={gradient ? '1' : '0'} y2="1">
            <stop offset="0" style={{ stopColor: from }} />
            <stop offset="1" style={{ stopColor: to }} />
          </linearGradient>
        </defs>
        <path d={SQUIRCLE} fill={`url(#${id}f)`} />
      </svg>
      {fill ? (
        <span
          className="absolute inset-0"
          style={{ mask: SQUIRCLE_MASK, WebkitMask: SQUIRCLE_MASK }}
        >
          <GlyphIcon className="h-full w-full" />
        </span>
      ) : (
        <GlyphIcon className="relative h-[58%] w-[58%]" strokeWidth={size === 'xs' ? 2.5 : 2.25} />
      )}
    </span>
  );
}
