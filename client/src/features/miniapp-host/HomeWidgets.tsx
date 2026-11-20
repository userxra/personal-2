import { Link } from 'react-router-dom';
import { enabledApps, useMiniappState } from './api';
import { MiniappIcon } from './MiniappIcon';
import { MiniappRuntime } from './Runtime';

/** Widgets of the miniapps whose "Widget on Home" is on. Nothing at all when there are none. */
export function HomeWidgets() {
  const state = useMiniappState();
  const apps = enabledApps(state.data).filter((a) => a.Widget && state.data?.apps[a.id]?.onHome);
  if (!apps.length) return null;
  return (
    <section aria-label="Widgets" className="space-y-3">
      {apps.map((a) => {
        const Widget = a.Widget!;
        return (
          <div key={a.id} className="rounded-md border border-line bg-surface">
            <Link
              to={`/miniapps/${a.id}`}
              className="flex items-center gap-2 border-b border-line/70 px-3 py-2 text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint hover:text-ink"
            >
              <MiniappIcon {...a.icon} app={a} size="xs" />
              {a.name}
            </Link>
            <div className="p-3">
              <MiniappRuntime definition={a} place="widget">
                <Widget />
              </MiniappRuntime>
            </div>
          </div>
        );
      })}
    </section>
  );
}
