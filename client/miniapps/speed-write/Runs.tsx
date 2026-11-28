import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, MoreHorizontal, Monitor, Smartphone, Trash2 } from 'lucide-react';
import { cn, dayKey } from '@miniapp/sdk';
import { fmtTime, type Session } from './logic';

/** Opens a small "Delete" menu: right click, long press, or the three dots. */
function RunRow({ s, onDelete }: { s: Session; onDelete: (s: Session) => void }) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const row = useRef<HTMLLIElement>(null);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const today = dayKey();

  const openAt = (clientX: number, clientY: number) => {
    const r = row.current?.getBoundingClientRect();
    if (!r) return;
    setMenu({
      x: Math.max(0, Math.min(clientX - r.left, r.width - 150)),
      y: Math.max(0, Math.min(clientY - r.top, r.height)),
    });
  };
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof PointerEvent && (e.target as Element | null)?.closest('[data-run-menu]'))
        return;
      setMenu(null);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menu]);

  const when = new Date(s.t);
  const Dev = s.d === 'touch' ? Smartphone : s.d === 'pc' ? Monitor : null;

  return (
    <li
      ref={row}
      style={{ WebkitTouchCallout: 'none' }}
      className="group relative flex select-none items-center gap-2.5 py-2 sm:gap-3 transition-colors hover:bg-surface-2/50"
      onContextMenu={(e) => {
        e.preventDefault();
        cancelPress();
        openAt(e.clientX, e.clientY);
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch') return;
        const { clientX: x, clientY: y } = e;
        press.current = { x, y, timer: window.setTimeout(() => openAt(x, y), 500) };
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancelPress();
      }}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
    >
      <span className="w-14 font-serif text-base tabular-nums text-ink">
        {Math.round(s.wpm)}
        <span className="ml-0.5 font-sans text-2xs text-ink-faint">wpm</span>
      </span>
      <span className={cn('w-12 text-sm tabular-nums', s.acc < 90 ? 'text-bad' : 'text-ink-muted')}>
        {Math.round(s.acc)}%
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink-faint">
        {s.words} words, {fmtTime(s.secs)}
      </span>
      {Dev && (
        <Dev
          className="h-3.5 w-3.5 shrink-0 text-ink-faint"
          aria-label={s.d === 'touch' ? 'Phone or tablet' : 'Computer'}
        />
      )}
      <span className="w-14 shrink-0 text-right text-xs text-ink-faint">
        {dayKey(when) === today
          ? when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : when.toLocaleDateString([], { day: 'numeric', month: 'short' })}
      </span>
      <button
        type="button"
        aria-label="Run options"
        aria-haspopup="menu"
        data-run-menu
        onClick={(e) => {
          if (menu) return setMenu(null);
          const b = e.currentTarget.getBoundingClientRect();
          openAt(b.right - 150, b.bottom);
        }}
        className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink active:bg-surface-2"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu && (
        <div
          role="menu"
          data-run-menu
          style={{ left: menu.x, top: menu.y }}
          className="sw-pop absolute z-30 w-[150px] origin-top-left rounded border border-line-strong bg-raised p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            ref={(el) => el?.focus({ preventScroll: true })}
            onClick={() => {
              setMenu(null);
              onDelete(s);
            }}
            className="flex h-9 w-full items-center gap-2 rounded-sm px-2 text-sm text-bad hover:bg-bad/10 focus:bg-bad/10 focus:outline-none"
          >
            <Trash2 className="h-4 w-4" /> Delete run
          </button>
        </div>
      )}
    </li>
  );
}

export function RunList({ runs, onDelete }: { runs: Session[]; onDelete: (s: Session) => void }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {runs.map((s) => (
        <RunRow key={s.t} s={s} onDelete={onDelete} />
      ))}
    </ul>
  );
}

/** The "see all" page: the latest runs, newest first. */
export function RunsPage({
  runs,
  limit,
  onBack,
  onDelete,
}: {
  runs: Session[];
  limit: number;
  onBack: () => void;
  onDelete: (s: Session) => void;
}) {
  const shown = runs.slice(-limit).reverse();
  return (
    <div className="sw-rise space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex h-10 items-center gap-1 rounded pl-1 pr-2 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink active:bg-surface-2/60 sm:h-8"
        >
          <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" /> Back
        </button>
      </div>
      <div>
        <h2 className="font-serif text-[1.5rem] leading-tight text-ink">Recent runs</h2>
        <p className="mt-1 text-xs text-ink-faint">
          The latest {Math.min(limit, runs.length)}. Right click, long press or use the dots to
          delete one.
        </p>
      </div>
      {shown.length ? (
        <RunList runs={shown} onDelete={onDelete} />
      ) : (
        <p className="text-sm text-ink-faint">No runs here.</p>
      )}
    </div>
  );
}
