import { ChevronLeft, ChevronRight, Lock, Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn, useStatusBarColor } from '@miniapp/sdk';
import { LOOKS, type FlameTier } from './art';
import { Molar, StreakFlame } from './Molar';
import { STAGES, type Look, type Mood } from './logic';
import { mix, pageColour } from './theme';

/** The hero's colour for a form not reached yet. */
const LOCKED = '#9aa3b2';
const days = (n: number) => (n === 1 ? '1 day' : `${n} days`);
const LOOK_NEXT: Record<Look, Look> = { light: 'dark', dark: 'site', site: 'light' };
const LOOK_LABEL: Record<Look, string> = {
  light: 'Light look',
  dark: 'Dark look',
  site: 'Same look as the site',
};

/**
 * The top of Brush, from the very top of the screen: the streak in big numbers over the colour
 * of the form you're looking at, Molar in a soft light, and every form in a row you can swipe
 * through. Forms reached are in full colour, the current one with today's face; forms not
 * reached yet are only an outline. Then the progress to the next form, and what Molar says.
 */
export function Hero({
  current,
  streak,
  best,
  mood,
  line,
  flame,
  light,
  look,
  onLook,
}: {
  /** Index of the current form in STAGES. */
  current: number;
  streak: number;
  best: number;
  mood: Mood;
  line: string;
  flame: FlameTier | null;
  light: boolean;
  look: Look;
  onLook: (look: Look) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(current);

  // Start on the current form (and move there when it changes).
  useLayoutEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = current * el.clientWidth;
    setView(current);
  }, [current]);

  // Keep the form in view when the width changes (rotation, window resize).
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const el = track.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      el.scrollLeft = viewRef.current * el.clientWidth;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };
  const onScroll = () => {
    const el = track.current;
    if (el && el.clientWidth) setView(Math.round(el.scrollLeft / el.clientWidth));
  };

  const viewed = STAGES[view] ?? STAGES[current]!;
  const here = STAGES[current]!;
  const next = STAGES[current + 1];
  const reached = view <= current;

  // The colour: a soft version of the form's own colour at the top, a white light behind Molar,
  // fading into the page.
  const page = pageColour(light);
  const base = reached ? LOOKS[viewed.id].icon : LOCKED;
  const top = light ? mix(base, '#ffffff', 0.32) : mix(base, page, 0.22);
  const middle = mix(top, page, light ? 0.45 : 0.55);
  useStatusBarColor(top);

  const LookIcon = look === 'light' ? Sun : look === 'dark' ? Moon : Monitor;
  const sad = mood === 'angry' || mood === 'furious' || mood === 'frozen';
  const barColour = LOOKS[here.id].icon;

  return (
    <section
      className="relative -mx-4 overflow-hidden pt-safe sm:-mx-6 lg:mx-0 lg:mt-4 lg:rounded-[28px]"
      style={{
        background: `radial-gradient(circle at 50% 47%, rgba(255,255,255,${light ? 0.78 : 0.16}) 0, rgba(255,255,255,0) 34%), linear-gradient(180deg, ${top} 0%, ${top} 22%, ${middle} 62%, ${page} 100%)`,
      }}
      aria-label="Molar's forms"
    >
      {/* The streak, and the look */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 text-[#15111f]">
        <div>
          <p className="text-[1.0625rem] font-semibold">Streak days</p>
          <p className="mt-1 flex items-center gap-1.5 font-sans text-[4rem] font-extrabold leading-[0.95] tabular-nums tracking-tight">
            {streak}
            {flame && <StreakFlame tier={flame} className="h-14 w-12" />}
          </p>
          <p className="mt-1.5 text-sm font-medium opacity-70">Best {days(best)}</p>
        </div>
        <button
          type="button"
          onClick={() => onLook(LOOK_NEXT[look])}
          aria-label={`${LOOK_LABEL[look]}. Change`}
          title={LOOK_LABEL[look]}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/10 text-[#15111f] active:bg-black/20"
        >
          <LookIcon className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </div>

      {/* Every form, swipeable */}
      <div className="relative mt-2">
        <div
          ref={track}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {STAGES.map((st, i) => (
            <div
              key={st.id}
              className="flex w-full shrink-0 snap-center justify-center"
              aria-hidden={i !== view}
            >
              <Molar
                stage={st.id}
                mood={i === current ? mood : 'happy'}
                ghost={i > current}
                label={st.name}
                className={cn('h-72 w-72', i > current && 'text-[#15111f]/70')}
              />
            </div>
          ))}
        </div>
        {view > 0 && <Arrow side="left" onClick={() => go(view - 1)} label="Previous form" />}
        {view < STAGES.length - 1 && (
          <Arrow side="right" onClick={() => go(view + 1)} label="Next form" />
        )}
      </div>

      {/* The form you're looking at */}
      <div className="px-5 text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">{viewed.name}</h2>
        <p className="mt-0.5 flex items-center justify-center gap-1 text-sm text-ink-muted">
          {view === current ? (
            'Molar now'
          ) : reached ? (
            `Reached at ${days(viewed.from)}`
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              Unlocks at {days(viewed.from)}
            </>
          )}
        </p>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {STAGES.map((st, i) => (
            <button
              key={st.id}
              type="button"
              tabIndex={-1}
              onClick={() => go(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === view ? 'w-5 bg-ink/70' : 'w-1.5 bg-ink/20',
              )}
            />
          ))}
        </div>

        {/* Progress to the next form */}
        {next ? (
          <>
            <LevelBar value={streak} max={next.from} colour={barColour} />
            <button
              type="button"
              onClick={() => go(current + 1)}
              className="mt-2 inline-flex items-center gap-0.5 text-[0.9375rem] text-ink-muted"
            >
              {mood === 'frozen'
                ? `Frozen: log yesterday to keep ${here.name}`
                : `Just ${days(next.from - streak)} away from ${next.name}`}
              <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
          </>
        ) : (
          <p className="mt-4 text-[0.9375rem] font-medium text-ink-muted">
            The final form. A whole year, and counting.
          </p>
        )}
      </div>

      {/* What Molar says (about today) */}
      <p
        className={cn(
          'mx-4 mb-1 mt-4 rounded-[20px] bg-surface px-4 py-3 text-center font-serif text-[1.125rem] leading-snug shadow-[0_1px_3px_rgba(16,24,40,0.08)]',
          sad ? 'text-bad' : 'text-ink',
        )}
        style={{ fontVariationSettings: "'opsz' 24" }}
        data-testid="molar-line"
      >
        {line}
      </p>
    </section>
  );
}

/** The progress bar: a fat striped pill with the count in the middle (9/14). */
function LevelBar({ value, max, colour }: { value: number; max: number; colour: string }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div
      className="relative mx-auto mt-5 h-9 w-[min(19rem,88%)] rounded-full bg-surface p-[3px] shadow-[0_1px_3px_rgba(16,24,40,0.12)] ring-1 ring-black/5"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={`${value} of ${max} full days`}
    >
      {value > 0 && (
        <div
          className="h-full rounded-full"
          style={{
            width: `max(2rem, ${pct}%)`,
            backgroundColor: colour,
            backgroundImage:
              'repeating-linear-gradient(-60deg, rgba(255,255,255,0.32) 0 9px, rgba(255,255,255,0) 9px 18px)',
          }}
        />
      )}
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center text-[1.25rem] font-extrabold tabular-nums text-white"
        style={{ WebkitTextStroke: '4px #1d2340', paintOrder: 'stroke fill' }}
      >
        {value}/{max}
      </span>
    </div>
  );
}

function Arrow({
  side,
  onClick,
  label,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  label: string;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] active:opacity-70',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <Icon className="h-8 w-8" strokeWidth={2.75} />
    </button>
  );
}
