import { memo, useEffect, useRef, useState } from 'react';
import { Check, CornerDownLeft, RotateCcw, Trophy } from 'lucide-react';
import { cn, dayKey, SectionLabel, useAppData } from '@miniapp/sdk';
import {
  addSession,
  fmtTime,
  generate,
  INITIAL,
  LENGTHS,
  liveWpm,
  result as makeResult,
  totals,
  type Session,
  type Settings,
  type SpeedData,
} from './logic';

const STYLE = `
@keyframes sw-blink { 0%, 45% { opacity: 1 } 55%, 100% { opacity: 0 } }
@keyframes sw-rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
@keyframes sw-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
.sw-caret { animation: sw-blink 1.05s steps(1) infinite }
.sw-rise { animation: sw-rise .35s cubic-bezier(.2,.8,.2,1) both }
.sw-pop { animation: sw-pop .4s cubic-bezier(.2,.8,.2,1) both }
@media (prefers-reduced-motion: reduce) { .sw-caret, .sw-rise, .sw-pop { animation: none } }
`;

export default function SpeedWriteApp() {
  const { data, update, isLoading } = useAppData<SpeedData>();
  if (isLoading) return <div className="h-64" />;
  return <Loaded data={data} update={update} />;
}

interface RunState {
  id: number;
  target: string;
}

function Loaded({
  data,
  update,
}: {
  data: SpeedData;
  update: (fn: (d: SpeedData) => SpeedData) => void;
}) {
  const settings: Settings = { ...INITIAL.settings, ...data.settings };
  const [run, setRun] = useState<RunState>(() => ({ id: 0, target: generate(settings) }));
  const best = data.sessions.reduce((m, s) => Math.max(m, s.wpm), 0);

  const next = (s: Settings = settings) => setRun((r) => ({ id: r.id + 1, target: generate(s) }));
  const retry = () => setRun((r) => ({ ...r, id: r.id + 1 }));
  const change = (patch: Partial<Settings>) => {
    const s = { ...settings, ...patch };
    update((d) => ({ ...d, settings: { ...INITIAL.settings, ...d.settings, ...patch } }));
    next(s);
  };

  return (
    <div className="space-y-6 pb-6">
      <style>{STYLE}</style>
      <Options settings={settings} onChange={change} />
      <Run
        key={run.id}
        target={run.target}
        best={best}
        onFinish={(s) => update((d) => addSession(d, s))}
        onNext={() => next()}
        onRetry={retry}
      />
      <Stats sessions={data.sessions} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const TOGGLES: { key: keyof Omit<Settings, 'len'>; label: string; sample: string }[] = [
  { key: 'numbers', label: 'Numbers', sample: '42' },
  { key: 'symbols', label: 'Signs', sample: '$ € %' },
  { key: 'apostrophes', label: 'Apostrophes', sample: "don't" },
  { key: 'punctuation', label: 'Punctuation', sample: '. ,' },
  { key: 'capitals', label: 'Capitals', sample: 'Aa' },
];

function Options({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Words per text"
        className="flex rounded border border-line-strong p-0.5"
      >
        {LENGTHS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={settings.len === n}
            onClick={() => settings.len !== n && onChange({ len: n })}
            className={cn(
              'h-8 flex-1 rounded-sm text-sm transition-colors duration-150',
              settings.len === n
                ? 'bg-accent text-accent-ink'
                : 'text-ink-muted active:bg-surface-2',
            )}
          >
            {n} words
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {TOGGLES.map((t) => {
          const on = settings[t.key];
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ [t.key]: !on })}
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded border px-2.5 text-xs transition-colors duration-150',
                on
                  ? 'border-accent/60 bg-accent/10 text-ink'
                  : 'border-line-strong text-ink-faint active:bg-surface-2',
              )}
            >
              <span className={cn('font-mono', on ? 'text-accent' : 'text-ink-faint')}>
                {t.sample}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One run
// ---------------------------------------------------------------------------

interface Done extends Omit<Session, 't'> {
  newBest: boolean;
}

function useCountUp(to: number, ms = 700): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}

function Run({
  target,
  best,
  onFinish,
  onNext,
  onRetry,
}: {
  target: string;
  best: number;
  onFinish: (s: Session) => void;
  onNext: () => void;
  onRetry: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [focused, setFocused] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [, setTick] = useState(0);
  const start = useRef(0);
  const keys = useRef(0);
  const mistakes = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const cur = useRef<HTMLSpanElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const running = start.current > 0 && !done;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((n) => n + 1), 200);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  // Keep the current letter in the middle of the text box.
  useEffect(() => {
    const b = box.current;
    const c = cur.current;
    if (!b || !c) return;
    b.scrollTo({ top: c.offsetTop - b.clientHeight / 2 + c.offsetHeight, behavior: 'smooth' });
  }, [typed.length]);

  const onChange = (value: string) => {
    if (done) return;
    const val = value.slice(0, target.length);
    if (val.length > typed.length) {
      if (!start.current) start.current = performance.now();
      for (let i = typed.length; i < val.length; i++) {
        keys.current++;
        if (val[i] !== target[i]) mistakes.current++;
      }
    }
    setTyped(val);
    if (val === target) {
      const r = makeResult(
        target.length,
        keys.current,
        mistakes.current,
        performance.now() - start.current,
        target.split(' ').length,
      );
      setDone({ ...r, newBest: best > 0 && r.wpm > best });
      onFinish({ t: new Date().toISOString(), ...r });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onRetry();
    } else if (e.key === 'Tab' || (e.key === 'Enter' && done)) {
      e.preventDefault();
      onNext();
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
    }
  };

  let correct = 0;
  while (correct < typed.length && typed[correct] === target[correct]) correct++;
  const ms = done ? done.secs * 1000 : start.current ? performance.now() - start.current : 0;
  const wpm = done ? done.wpm : liveWpm(correct, ms);
  const acc = done
    ? done.acc
    : keys.current
      ? ((keys.current - mistakes.current) / keys.current) * 100
      : 100;
  const pct = (typed.length / target.length) * 100;
  const wrong = typed.length === target.length && !done;

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Live label="wpm" value={start.current || done ? String(Math.round(wpm)) : '--'} big />
        <Live label="accuracy" value={`${Math.round(acc)}%`} warn={acc < 90} />
        <Live label="time" value={fmtTime(ms / 1000)} />
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-line">
        <div
          className={cn(
            'h-full rounded-full transition-[width,background-color] duration-200 ease-out',
            done ? 'bg-ok' : 'bg-accent',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div
        className={cn(
          'relative rounded border bg-surface transition-colors duration-200',
          focused ? 'border-accent/60' : 'border-line',
          done && 'border-ok/50',
        )}
      >
        <div
          ref={box}
          className={cn(
            'relative h-44 overflow-hidden px-4 py-3 font-mono text-[1.0625rem] leading-8 transition-[filter,opacity] duration-200 sm:text-[1.1875rem]',
            !focused && !done && 'opacity-60 blur-[1.5px]',
          )}
        >
          <Text target={target} typed={typed} curRef={cur} active={focused && !done} />
        </div>
        {!focused && !done && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="sw-rise rounded border border-line-strong bg-bg/90 px-3 py-1.5 text-sm text-ink">
              {typed ? 'Tap to continue' : 'Tap here and start typing'}
            </span>
          </div>
        )}
        <input
          ref={input}
          value={typed}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPaste={(e) => e.preventDefault()}
          onSelect={(e) => {
            const el = e.currentTarget;
            if (el.selectionStart !== el.value.length || el.selectionEnd !== el.value.length)
              el.setSelectionRange(el.value.length, el.value.length);
          }}
          aria-label="Type the text shown"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
      </div>

      {wrong && (
        <p className="sw-rise text-sm text-bad">
          Almost there: fix the red letters with backspace to finish.
        </p>
      )}

      {done ? (
        <Finished done={done} onNext={onNext} onRetry={onRetry} />
      ) : (
        <div className="flex items-center justify-between text-xs text-ink-faint">
          <span className="hidden sm:inline">Tab: new text. Esc: restart.</span>
          <span className="sm:hidden">Mistakes stay red until you fix them.</span>
          <span className="flex gap-1">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-ink-muted active:bg-surface-2"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restart
            </button>
            <button
              type="button"
              onClick={onNext}
              className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-ink-muted active:bg-surface-2"
            >
              New text
            </button>
          </span>
        </div>
      )}
    </section>
  );
}

function Live({
  label,
  value,
  big,
  warn,
}: {
  label: string;
  value: string;
  big?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <p
        className={cn(
          'font-serif leading-none tabular-nums transition-colors duration-200',
          big ? 'text-[2.25rem]' : 'text-[1.75rem] pt-[0.4rem]',
          warn ? 'text-bad' : 'text-ink',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-2xs uppercase tracking-wide text-ink-faint">{label}</p>
    </div>
  );
}

/** The text: words are unbreakable boxes, each letter coloured by its state. */
const Text = memo(function Text({
  target,
  typed,
  curRef,
  active,
}: {
  target: string;
  typed: string;
  curRef: React.RefObject<HTMLSpanElement>;
  active: boolean;
}) {
  const words = target.split(' ');
  let i = 0;
  return (
    <div className="select-none">
      {words.map((w, wi) => {
        const chars = wi < words.length - 1 ? `${w} ` : w;
        const el = (
          <span key={wi} className="inline-block whitespace-pre">
            {chars.split('').map((ch, ci) => {
              const idx = i + ci;
              const isCur = idx === typed.length;
              const state =
                idx < typed.length ? (typed[idx] === ch ? 'ok' : 'bad') : isCur ? 'cur' : 'todo';
              return (
                <span
                  key={ci}
                  ref={isCur ? curRef : undefined}
                  className={cn(
                    'relative rounded-sm transition-colors duration-100',
                    state === 'ok' && 'text-ink',
                    state === 'bad' && 'bg-bad/20 text-bad',
                    state === 'cur' && 'bg-accent/15 text-ink',
                    state === 'todo' && 'text-ink-faint',
                  )}
                >
                  {isCur && active && (
                    <i className="sw-caret absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-accent" />
                  )}
                  {ch}
                </span>
              );
            })}
          </span>
        );
        i += chars.length;
        return el;
      })}
    </div>
  );
});

function Finished({
  done,
  onNext,
  onRetry,
}: {
  done: Done;
  onNext: () => void;
  onRetry: () => void;
}) {
  const wpm = useCountUp(done.wpm);
  return (
    <div className="sw-rise space-y-4 rounded border border-ok/40 bg-ok/5 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-serif text-[3rem] leading-none tabular-nums text-ink">
            {wpm.toFixed(0)}
            <span className="ml-1.5 font-sans text-sm text-ink-muted">wpm</span>
          </p>
        </div>
        {done.newBest && (
          <span className="sw-pop inline-flex items-center gap-1.5 rounded border border-warn/50 px-2 py-1 text-xs text-warn">
            <Trophy className="h-3.5 w-3.5" /> New best
          </span>
        )}
      </div>
      <dl className="grid grid-cols-4 gap-3 text-sm">
        {[
          ['accuracy', `${done.acc}%`],
          ['raw', `${Math.round(done.raw)}`],
          ['time', fmtTime(done.secs)],
          ['letters', String(done.chars)],
        ].map(([k, v]) => (
          <div key={k}>
            <dd className="font-serif text-lg tabular-nums text-ink">{v}</dd>
            <dt className="text-2xs uppercase tracking-wide text-ink-faint">{k}</dt>
          </div>
        ))}
      </dl>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded bg-accent text-sm font-medium text-accent-ink active:opacity-90"
        >
          Next text <CornerDownLeft className="hidden h-4 w-4 sm:block" />
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center gap-2 rounded border border-line-strong px-3 text-sm text-ink-muted active:bg-surface-2"
        >
          <RotateCcw className="h-4 w-4" /> Retry
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function Stats({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-faint">
        <Check className="h-4 w-4" /> Finish a text and your stats appear here.
      </p>
    );
  }
  const today = dayKey();
  const t = totals(sessions, (iso) => dayKey(new Date(iso)) === today);
  const recent = sessions.slice(-6).reverse();
  return (
    <section className="space-y-4">
      <SectionLabel>Stats</SectionLabel>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        {[
          ['best wpm', String(Math.round(t.best))],
          ['last 10 avg', String(Math.round(t.avg10))],
          ['best accuracy', `${t.bestAcc}%`],
          ['runs today', String(t.today)],
          ['all runs', String(t.count)],
          ['words typed', String(t.words)],
          ['time spent', fmtTime(t.secs)],
        ].map(([k, v]) => (
          <div key={k} className="border-t border-line pt-2">
            <p className="font-serif text-[1.5rem] leading-none tabular-nums text-ink">{v}</p>
            <p className="mt-1 text-2xs uppercase tracking-wide text-ink-faint">{k}</p>
          </div>
        ))}
      </div>
      <Trend sessions={sessions.slice(-24)} />
      <ul className="divide-y divide-line border-y border-line text-sm">
        {recent.map((s) => (
          <li key={s.t} className="flex items-center gap-3 py-2">
            <span className="w-14 font-serif text-base tabular-nums text-ink">
              {Math.round(s.wpm)}
              <span className="ml-0.5 font-sans text-2xs text-ink-faint">wpm</span>
            </span>
            <span className={cn('w-12 tabular-nums', s.acc < 90 ? 'text-bad' : 'text-ink-muted')}>
              {Math.round(s.acc)}%
            </span>
            <span className="flex-1 text-ink-faint">
              {s.words} words, {fmtTime(s.secs)}
            </span>
            <span className="text-xs text-ink-faint">
              {dayKey(new Date(s.t)) === today
                ? new Date(s.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date(s.t).toLocaleDateString([], { day: 'numeric', month: 'short' })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Trend({ sessions }: { sessions: Session[] }) {
  if (sessions.length < 2) return null;
  const W = 300;
  const H = 64;
  const max = Math.max(...sessions.map((s) => s.wpm));
  const min = Math.min(...sessions.map((s) => s.wpm));
  const span = Math.max(max - min, 10);
  const pts = sessions.map((s, i) => [
    (i / (sessions.length - 1)) * (W - 8) + 4,
    H - 8 - ((s.wpm - min) / span) * (H - 16),
  ]);
  const last = pts[pts.length - 1] as number[];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" role="img" aria-label="Speed trend">
        <polyline
          points={pts.map((p) => p.join(',')).join(' ')}
          fill="none"
          className="stroke-accent"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={last[0]} cy={last[1]} r={3.5} className="fill-accent" />
      </svg>
      <p className="flex justify-between text-2xs text-ink-faint">
        <span>Last {sessions.length} runs</span>
        <span>
          {Math.round(min)} to {Math.round(max)} wpm
        </span>
      </p>
    </div>
  );
}
