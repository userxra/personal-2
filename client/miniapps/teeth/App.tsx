import { Check, Moon, Sun } from 'lucide-react';
import { addDays, cn, useAppData, useNow, useToast } from '@miniapp/sdk';
import { History } from './History';
import type { FlameTier } from './art';
import { Molar, StreakFlame } from './Molar';
import {
  currentSlot,
  flameOf,
  formStreak,
  moodOf,
  pastTime,
  setSlot,
  stageOf,
  stats,
  todayKey,
  type BrushData,
  type Slot,
} from './logic';

const SLOT = {
  m: { label: 'Morning', Icon: Sun },
  e: { label: 'Evening', Icon: Moon },
} as const;
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function TeethApp() {
  const { data, update, isLoading } = useAppData<BrushData>();
  const now = useNow();
  const toast = useToast();
  const today = todayKey(now);
  const s = stats(data, now);
  const { mood, line } = moodOf(s, now);
  const slotNow = currentSlot(now);
  const form = formStreak(s, mood);
  const { stage, next } = stageOf(form);
  const flame = flameOf(form, mood);

  if (isLoading) return <div className="h-64" />;

  const log = (day: string, slot: Slot) => {
    const at = day === today ? new Date().toISOString() : pastTime(day, slot);
    update((d) => setSlot(d, day, slot, at));
    toast({
      message: `${SLOT[slot].label} brush logged`,
      action: { label: 'Undo', onClick: () => update((d) => setSlot(d, day, slot, null)) },
    });
  };
  const unlog = (day: string, slot: Slot) => update((d) => setSlot(d, day, slot, null));

  const yesterday = addDays(today, -1);
  const yesterdayMissing =
    s.firstDay && s.firstDay <= yesterday
      ? (['m', 'e'] as const).filter((k) => !s.yesterday[k])
      : [];

  return (
    <div className="space-y-8">
      {/* Molar, his form, and what he thinks */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Molar stage={stage.id} mood={mood} label={stage.name} className="h-36 w-36 shrink-0" />
          <div className="min-w-0">
            <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint">
              {stage.name}
            </p>
            <p
              className={cn(
                'mt-1 font-serif text-[1.1875rem] leading-snug',
                mood === 'angry' || mood === 'furious' || mood === 'frozen'
                  ? 'text-bad'
                  : 'text-ink',
              )}
              style={{ fontVariationSettings: "'opsz' 24" }}
              data-testid="molar-line"
            >
              {line}
            </p>
          </div>
        </div>
        {next && mood !== 'frozen' && (
          <div className="space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${((form - stage.from) / (next.from - stage.from)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-ink-muted">
              {next.from - form === 1 ? '1 more full day' : `${next.from - form} more full days`}{' '}
              until Molar turns {next.name}
            </p>
          </div>
        )}
      </div>

      {/* Today */}
      <div className="grid grid-cols-2 gap-3">
        {(['m', 'e'] as const).map((slot) => {
          const done = s.today[slot];
          const { label, Icon } = SLOT[slot];
          return (
            <div key={slot}>
              <button
                type="button"
                onClick={() => (done ? undefined : log(today, slot))}
                aria-pressed={!!done}
                className={cn(
                  'flex h-24 w-full flex-col items-center justify-center gap-1 rounded-md border transition-colors',
                  done
                    ? 'border-ok/50 bg-ok/10 text-ink'
                    : slot === slotNow
                      ? 'border-accent/70 bg-surface text-ink active:bg-surface-2'
                      : 'border-line bg-surface text-ink-muted active:bg-surface-2',
                )}
              >
                {done ? (
                  <Check className="h-6 w-6 text-ok" strokeWidth={2.25} />
                ) : (
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                )}
                <span className="font-medium">{label}</span>
                <span className="text-2xs text-ink-faint">
                  {done ? `Brushed ${time(done)}` : 'Tap when brushed'}
                </span>
              </button>
              {done && (
                <button
                  type="button"
                  onClick={() => unlog(today, slot)}
                  className="mt-1 w-full text-center text-2xs text-ink-faint hover:text-ink"
                >
                  Undo
                </button>
              )}
            </div>
          );
        })}
      </div>

      {yesterdayMissing.length > 0 && (
        <p className="text-sm text-ink-muted">
          Forgot to log yesterday?{' '}
          {yesterdayMissing.map((slot, i) => (
            <span key={slot}>
              {i > 0 && ' · '}
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => log(yesterday, slot)}
              >
                I brushed yesterday {SLOT[slot].label.toLowerCase()}
              </button>
            </span>
          ))}
        </p>
      )}

      {/* Numbers */}
      <div className="grid grid-cols-3 divide-x divide-line border-y border-line py-3 text-center">
        <Number value={form} label="day streak" flame={flame} />
        <Number value={s.best} label="best streak" />
        <Number value={s.total} label="brushes" />
      </div>

      {/* The record: two weeks, or every month; tap a day to fix it */}
      <History data={data} today={today} firstDay={s.firstDay} update={update} />
    </div>
  );
}

function Number({
  value,
  label,
  flame,
}: {
  value: number;
  label: string;
  flame?: FlameTier | null;
}) {
  return (
    <div className="px-2">
      <div className="flex items-center justify-center gap-1 font-serif text-[1.625rem] leading-none text-ink">
        {flame && <StreakFlame tier={flame} className="-my-1 h-8 w-7" />}
        {value}
      </div>
      <div className="mt-1 text-2xs text-ink-faint">{label}</div>
    </div>
  );
}
