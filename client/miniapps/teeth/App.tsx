import { Check, Moon, Sun } from 'lucide-react';
import { addDays, cn, useAppData, useNow, useToast } from '@miniapp/sdk';
import { Badges } from './Badges';
import { Hero } from './Hero';
import { History } from './History';
import {
  currentSlot,
  flameOf,
  formStreak,
  moodOf,
  pastTime,
  setSlot,
  STAGES,
  stageOf,
  stats,
  todayKey,
  type BrushData,
  type Slot,
} from './logic';
import { isLight, themeVars } from './theme';

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
  const { stage } = stageOf(form);
  const flame = flameOf(form, mood);
  const look = data.look ?? 'light';
  const light = isLight(look);

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
    // The whole screen, edge to edge, in Brush's own light or dark look.
    <div
      style={themeVars(light)}
      className="-mx-4 -mb-28 min-h-[100dvh] space-y-4 bg-bg px-4 pb-28 text-ink sm:-mx-6 sm:px-6 lg:-mb-16 lg:pb-16"
    >
      <Hero
        current={STAGES.indexOf(stage)}
        streak={form}
        best={s.best}
        mood={mood}
        line={line}
        flame={flame}
        light={light}
        look={look}
        onLook={(l) => update((d) => ({ ...d, look: l }))}
      />

      <section className="rounded-[20px] bg-surface p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold text-ink">Today</h2>
          <span className="text-xs text-ink-faint">{s.total} brushes logged</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
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
                    'flex h-24 w-full flex-col items-center justify-center gap-1 rounded-[14px] border transition-colors',
                    done
                      ? 'border-ok/50 bg-ok/10 text-ink'
                      : slot === slotNow
                        ? 'border-accent/70 bg-surface-2 text-ink active:bg-raised'
                        : 'border-line bg-surface-2/60 text-ink-muted active:bg-surface-2',
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
          <p className="mt-3 text-sm text-ink-muted">
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
      </section>

      <Badges streak={form} />

      {/* The record: two weeks, or every month; tap a day to fix it */}
      <section className="rounded-[20px] bg-surface p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <History data={data} today={today} firstDay={s.firstDay} update={update} />
      </section>
    </div>
  );
}
