import { Monitor, Smartphone } from 'lucide-react';
import { cn, dayKey, SectionLabel } from '@miniapp/sdk';
import { RunList } from './Runs';
import { fmtTime, inFilter, totals, type Filter, type Session } from './logic';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pc', label: 'Computer' },
  { id: 'touch', label: 'Phone' },
];

export function Stats({
  sessions,
  filter,
  onFilter,
  onSeeAll,
  onDelete,
}: {
  sessions: Session[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  onSeeAll: () => void;
  onDelete: (s: Session) => void;
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-ink-faint">Finish a text and your stats appear here.</p>;
  }
  const runs = inFilter(sessions, filter);
  const today = dayKey();
  const t = totals(runs, (iso) => dayKey(new Date(iso)) === today);
  const recent = runs.slice(-6).reverse();
  const count = (f: Filter) => inFilter(sessions, f).length;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Stats</SectionLabel>
        <div
          role="radiogroup"
          aria-label="Show stats for"
          className="flex rounded border border-line-strong p-0.5"
        >
          {FILTERS.map((f) => {
            const Icon = f.id === 'pc' ? Monitor : f.id === 'touch' ? Smartphone : null;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={filter === f.id}
                onClick={() => onFilter(f.id)}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-xs transition-colors duration-150',
                  filter === f.id
                    ? 'bg-accent text-accent-ink'
                    : 'text-ink-muted hover:text-ink active:bg-surface-2',
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {f.label}
                <span className="opacity-60">{count(f.id)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {runs.length === 0 ? (
        <p className="text-sm text-ink-faint">
          No runs on {filter === 'pc' ? 'a computer' : 'a phone or tablet'} yet.
        </p>
      ) : (
        <>
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
          <Trend sessions={runs.slice(-24)} />
          <div className="space-y-2">
            <RunList runs={recent} onDelete={onDelete} />
            {runs.length > recent.length && (
              <button
                type="button"
                onClick={onSeeAll}
                className="h-9 text-sm text-accent hover:underline"
              >
                See all text ({Math.min(30, runs.length)})
              </button>
            )}
          </div>
        </>
      )}
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
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-16 w-full lg:h-20"
        role="img"
        aria-label="Speed trend"
      >
        <polyline
          points={pts.map((p) => p.join(',')).join(' ')}
          fill="none"
          className="stroke-accent"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={last[0]}
          x2={last[0]}
          y1={last[1]}
          y2={(last[1] ?? 0) + 0.01}
          className="stroke-accent"
          strokeWidth={7}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
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
