import { Fragment } from 'react';
import { cn } from '@miniapp/sdk';
import { StreakFlame } from './Molar';
import { BADGES } from './logic';

/** The streak badges in a row: flames reached in colour, the rest greyed out. */
export function Badges({ streak }: { streak: number }) {
  return (
    <section className="rounded-[20px] bg-surface p-4">
      <h2 className="text-base font-bold text-ink">Streak badges</h2>
      <div className="mt-4 flex items-start">
        {BADGES.map((b, i) => {
          const got = streak >= b.from;
          return (
            <Fragment key={b.tier}>
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'mx-0.5 mt-[1.15rem] h-1 min-w-1 flex-1 rounded-full',
                    got ? 'bg-[#ffb37a]' : 'bg-ink/10',
                  )}
                />
              )}
              <div className="flex w-10 shrink-0 flex-col items-center gap-1">
                <StreakFlame
                  tier={b.tier}
                  className={cn('h-10 w-9', !got && 'opacity-35 grayscale')}
                />
                <span
                  className={cn('text-xs tabular-nums', got ? 'text-ink' : 'text-ink-faint')}
                  aria-label={`${b.from} days${got ? ', reached' : ''}`}
                >
                  {b.from}d
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
