import type { ComponentType, LazyExoticComponent } from 'react';

type Lazyable<P> = ComponentType<P> | LazyExoticComponent<ComponentType<P>>;

/** An icon picture: an SVG component taking a class and stroke width (lucide icons fit). */
export type Glyph = ComponentType<{ className?: string; strokeWidth?: string | number }>;

/** An app's icon. */
export interface MiniappIconSpec {
  /** The picture on the icon: an SVG component (a lucide icon works) drawn in `color`. */
  glyph: Glyph;
  /** Icon colour (e.g. '#22a38a'); also `var(--icon-bg)` inside a custom glyph. */
  background: string;
  /** Optional: a two-colour gradient, top left to bottom right (e.g. ['#5fe0c4', '#14917a']). */
  gradient?: readonly [string, string];
  /** Colour of the glyph. Default white. */
  color?: string;
  /**
   * Optional: the glyph is a whole picture drawn edge to edge (and cut to the icon's shape)
   * instead of a symbol in the middle.
   */
  fill?: boolean;
}

/** What a miniapp declares about itself (its `index.ts` default export). */
export interface MiniappDefinition<T = unknown> {
  /** Lower-case letters, digits and dashes; the folder name. Never change it: data is kept under it. */
  id: string;
  /** Shown under the icon, in the Store and on its screen. Short (one or two words). */
  name: string;
  /** One sentence: under its name in the Store. */
  description: string;
  /** Optional: a few short points for its Store page ("About this app"). */
  about?: string[];
  icon: MiniappIconSpec;
  /**
   * Optional: an icon that follows the app's data (a mascot's mood, say). Return the parts of
   * `icon` that change, or null for the usual icon. Runs whenever the icon shows, so keep it
   * quick, and return the same glyph component for the same picture (keep them in a Map).
   */
  liveIcon?: (data: T, now: Date) => Partial<MiniappIconSpec> | null;
  /**
   * Optional: the app's screen fills the page, with no title bar or back link above it. The app
   * then draws its own top (clearing the phone's status bar with `pt-safe`).
   */
  fullScreen?: boolean;
  /** The app's screen. Load it lazily: `lazy(() => import('./App'))`. */
  App: Lazyable<object>;
  /** Optional Home widget (a small card). Load it lazily too. */
  Widget?: Lazyable<object>;
  /**
   * Optional: a red badge on the app's icon, worked out from its data: a number (how many things
   * are waiting), `true` (a dot), or 0 / false / null (none). Runs whenever the miniapps screen
   * shows, so keep it quick.
   */
  badge?: (data: T, now: Date) => number | boolean | null;
  /** The data a fresh install starts with (what `useAppData()` returns before anything is saved). */
  initialData: T;
  /**
   * Optional: combine this device's unsaved data with newer data from another device (after
   * being offline, for instance). Without it, this device's data wins.
   */
  merge?: (server: T, local: T) => T;
}

/** Declares a miniapp (identity function: it only checks and types the definition). */
export function defineMiniapp<T>(def: MiniappDefinition<T>): MiniappDefinition<T> {
  if (!/^[a-z][a-z0-9-]{1,39}$/.test(def.id) || ['store', 'wallpaper'].includes(def.id))
    throw new Error(`Miniapp id "${def.id}" is not allowed`);
  return def;
}
