import { dayKey, useAppData, useMiniapp } from '@miniapp/sdk';
import { totals, type SpeedData } from './logic';

/** Home widget: today's runs, best and recent average, tap to practise. */
export default function SpeedWidget() {
  const { data, isLoading } = useAppData<SpeedData>();
  const { open } = useMiniapp();
  if (isLoading) return <div className="h-14" />;
  const today = dayKey();
  const t = totals(data.sessions, (iso) => dayKey(new Date(iso)) === today);
  return (
    <button type="button" onClick={open} className="flex w-full items-center gap-4 text-left">
      <div>
        <p className="font-serif text-[1.75rem] leading-none text-ink">
          {t.count ? Math.round(t.best) : '--'}
        </p>
        <p className="mt-1 text-2xs uppercase tracking-wide text-ink-faint">best wpm</p>
      </div>
      <div className="min-w-0 flex-1 text-sm text-ink-muted">
        {t.count === 0
          ? 'Type your first text.'
          : t.today === 0
            ? 'Nothing typed today yet.'
            : `${t.today} ${t.today === 1 ? 'run' : 'runs'} today`}
        {t.count > 0 && <span className="block text-xs">Recent average {Math.round(t.avg10)} wpm</span>}
      </div>
    </button>
  );
}
