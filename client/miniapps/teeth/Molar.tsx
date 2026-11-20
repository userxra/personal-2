import { useId, useMemo } from 'react';
import { cn, type Glyph } from '@miniapp/sdk';
import { flameMarkup, iconViewBox, molarMarkup, VIEWBOX, type FlameTier } from './art';
import type { Mood, StageId } from './logic';

/*
 * The pictures are SVG markup built in art.ts from constants only (no saved data, nothing a
 * person typed), so putting them in with dangerouslySetInnerHTML is safe.
 */

const STYLE = `
@keyframes molar-fl { 0% { transform: scale(1, 1) skewX(0deg) } 50% { transform: scale(.96, 1.05) skewX(2deg) } 100% { transform: scale(1.03, .96) skewX(-2deg) } }
.molar-fl { transform-box: fill-box; transform-origin: 50% 100%; animation: molar-fl 1.6s ease-in-out infinite alternate; }
@keyframes molar-shake { 0%,100% { transform: rotate(0) } 20% { transform: rotate(-4deg) } 40% { transform: rotate(4deg) } 60% { transform: rotate(-3deg) } 80% { transform: rotate(2deg) } }
.molar-shake { transform-origin: 50% 90%; animation: molar-shake 0.6s ease-in-out 0.2s 2; }
@media (prefers-reduced-motion: reduce) { .molar-fl, .molar-shake { animation: none; } }`;

/** A prefix for the SVG's ids, unique on the page. */
const useIdPrefix = () => 'm' + useId().replace(/[^a-zA-Z0-9]/g, '');

/** Molar: his form comes from the streak, his face from today. */
export function Molar({
  stage,
  mood,
  label,
  ghost,
  className,
}: {
  stage: StageId;
  mood: Mood;
  label?: string;
  /** Not reached yet: only his outline. */
  ghost?: boolean;
  className?: string;
}) {
  const P = useIdPrefix();
  const html = useMemo(
    () => `<style>${STYLE}</style>${molarMarkup(stage, mood, P, false, ghost)}`,
    [stage, mood, P, ghost],
  );
  return (
    <svg
      viewBox={VIEWBOX}
      className={cn((mood === 'angry' || mood === 'furious') && 'molar-shake', className)}
      role="img"
      aria-label={
        ghost ? `${label ?? 'Molar'}, not reached yet` : `${label ?? 'Molar'} looks ${mood}`
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** The streak flame by the number. */
export function StreakFlame({ tier, className }: { tier: FlameTier; className?: string }) {
  const P = useIdPrefix();
  const html = useMemo(() => flameMarkup(tier, P), [tier, P]);
  return (
    <svg
      viewBox="0 0 32 36"
      className={className}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** The app icon's picture for a form and mood: one component per pair, kept, so it never remounts. */
const glyphs = new Map<string, Glyph>();
export function molarGlyph(stage: StageId, mood: Mood): Glyph {
  const key = `${stage}:${mood}`;
  let glyph = glyphs.get(key);
  if (!glyph) {
    const MolarIconPicture = ({ className }: { className?: string }) => {
      const P = useIdPrefix();
      const html = useMemo(() => molarMarkup(stage, mood, P, true), [P]);
      return (
        <svg
          viewBox={iconViewBox(stage)}
          className={className}
          aria-hidden
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    };
    glyph = MolarIconPicture;
    glyphs.set(key, glyph);
  }
  return glyph;
}
