import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@miniapp/sdk';
import { LOOKS, type FlameTier } from './art';
import { Molar, StreakFlame } from './Molar';
import { STAGES, type Mood } from './logic';

/** Colour of the top of the hero for a form you haven't reached: a quiet grey. */
const LOCKED = '#8a94a6';
const days = (n: number) => (n === 1 ? '1 day' : `${n} days`);

/**
 * The top of Brush: the streak in big numbers over Molar's colour, and every form of Molar in a
 * row you can swipe through. Forms reached are in full colour, the current one with today's
 * face; forms not reached yet are only an outline.
 */
export function Hero({
  current,
  streak,
  best,
  mood,
  line,
  flame,
}: {
  /** Index of the current form in STAGES. */
  current: number;
  streak: number;
  best: number;
  mood: Mood;
  line: string;
  flame: FlameTier | null;
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
  const reached = view <= current;
  const tint = reached ? LOOKS[viewed.id].icon : LOCKED;
  const next = STAGES[current + 1];
  const here = STAGES[current]!;
  const sad = mood === 'angry' || mood === 'furious' || mood === 'frozen';

  return (
    <section
      className="relative -mx-4 overflow-hidden pb-5 sm:mx-0 sm:rounded-[28px]"
      style={{
        background: `linear-gradient(180deg, ${tint} 0%, ${tint}d0 30%, ${tint}55 62%, ${tint}00 100%)`,
        transition: 'background 300ms',
      }}
      aria-label="Molar's forms"
    >
      {/* The streak */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 text-[#15111f]">
        <div>
          <p className="text-sm font-semibold">Streak days</p>
          <p className="mt-1 flex items-center gap-1 font-sans text-[3.75rem] font-extrabold leading-none tabular-nums tracking-tight">
            {streak}
            {flame && <StreakFlame tier={flame} className="h-14 w-12" />}
          </p>
        </div>
        <p className="mt-1 rounded-full bg-white/35 px-3 py-1 text-xs font-semibold backdrop-blur">
          Best {best}
        </p>
      </div>

      {/* Every form, swipeable */}
      <div className="relative">
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
                className={cn('h-64 w-64', i > current && 'text-ink')}
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
        <h2 className="text-xl font-bold text-ink">{viewed.name}</h2>
        <p className="mt-0.5 flex items-center justify-center gap-1 text-sm text-ink-muted">
          {view === current && mood === 'frozen' ? (
            'Frozen: log yesterday to keep this form'
          ) : view === current ? (
            next ? (
              `${days(next.from - streak)} until ${next.name}`
            ) : (
              'The final form'
            )
          ) : reached ? (
            `Reached at ${days(viewed.from)}`
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              Unlocks at {days(viewed.from)}, {days(viewed.from - streak)} to go
            </>
          )}
        </p>
        {view === current && next && mood !== 'frozen' && (
          <div className="mx-auto mt-2 h-1.5 max-w-[14rem] overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(1, (streak - here.from) / (next.from - here.from)) * 100}%`,
                background: LOOKS[here.id].icon,
              }}
            />
          </div>
        )}
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {STAGES.map((st, i) => (
            <button
              key={st.id}
              type="button"
              tabIndex={-1}
              onClick={() => go(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === view ? 'w-5 bg-ink' : 'w-1.5 bg-ink/25',
              )}
            />
          ))}
        </div>
      </div>

      {/* What Molar says (about today) */}
      <p
        className={cn(
          'mx-4 mt-4 rounded-[18px] bg-surface px-4 py-3 text-center font-serif text-[1.125rem] leading-snug shadow-sm',
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
        'absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 text-[#15111f] backdrop-blur active:bg-white/50',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={2.5} />
    </button>
  );
}
