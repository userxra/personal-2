import { Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PAGE_FRAME } from '../../components/shell/PageHeader';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../lib/apiFetch';
import { useHoldWork } from '../../lib/busy';
import { cn } from '../../lib/cn';
import { enabledApps, useMiniappState, useSetInstall, useSetLayout } from './api';
import { sumBadges, useBadges, type Badge } from './badges';
import { CLOCK_ICON } from './builtins';
import { ClockWidget } from './ClockWidget';
import { FolderView } from './FolderView';
import { iconLookOf } from './iconLooks';
import { launchFrom } from './launch';
import {
  CLOCK_KEY,
  dropIntoFolder,
  folderKey,
  isIcon,
  keysToSave,
  screenTiles,
  takeOutOfFolder,
  widgetKey,
  type Folders,
  type IconTile,
  type Tile,
} from './layout';
import { MiniappIcon } from './MiniappIcon';
import { usePictureTone } from './pictureTone';
import { MiniappRuntime } from './Runtime';
import { BadgeDot, FolderIcon, type Tone } from './tiles';
import { useDragReorder } from './useDragReorder';
import { inkClass, wallpaperStyle } from './wallpapers';

/** Small rounded buttons that sit on the wallpaper (Edit, Done, Add widget). */
const PILL: Record<Tone, string> = {
  light: 'bg-white/15 text-white hover:bg-white/25 active:bg-white/30',
  dark: 'bg-black/[0.08] text-[#1d222b] hover:bg-black/[0.12] active:bg-black/15',
  theme: 'bg-surface-2/80 text-ink hover:bg-surface-2 active:bg-line',
};

/** Glass for widgets on the wallpaper: the site's surface, translucent and frosted. */
const GLASS =
  'rounded-[1.25rem] bg-surface/[0.86] ring-1 ring-inset ring-white/[0.08] backdrop-blur-xl backdrop-saturate-150';

/**
 * The miniapps screen, like a phone's home screen: app icons, folders and widgets on a
 * wallpaper. Hold a tile (or press Edit) to arrange: tiles wobble and can be dragged anywhere;
 * an icon held over another icon makes a folder (or goes into a folder); widgets can be added
 * and removed; apps taken off the screen. Opening an app grows its icon into the screen.
 */
export default function MiniappsPage() {
  const state = useMiniappState();
  const toast = useToast();
  const navigate = useNavigate();
  const setLayout = useSetLayout();
  const setInstall = useSetInstall();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<{ id: string; origin: DOMRect | null } | null>(null);
  // While arranging, pulling down moves tiles; it never refreshes the page.
  useHoldWork(editing);

  const apps = enabledApps(state.data);
  const tiles = screenTiles(state.data);
  const byKey = new Map(tiles.map((t) => [t.key, t]));
  const visible = tiles.map((t) => t.key);
  const saved = state.data?.settings.layout ?? null;
  const folders: Folders = state.data?.settings.folders ?? {};
  const badges = useBadges(apps);

  const wallpaper = state.data?.settings.wallpaper;
  const wp = wallpaperStyle(wallpaper, usePictureTone(wallpaper));
  const tone: Tone = wp.ink;
  const ink = inkClass(wp.ink, wallpaper?.kind === 'image');

  const onError = (err: unknown) => toast({ message: errorMessage(err), tone: 'error' });
  const save = (keys: string[], removed?: string[], nextFolders?: Folders) =>
    setLayout.mutate(
      { layout: keysToSave(saved, keys, removed), folders: nextFolders },
      { onError },
    );

  const isIconKey = (k: string) => {
    const t = byKey.get(k);
    return !!t && isIcon(t);
  };
  const drag = useDragReorder({
    keys: visible,
    editing,
    onStart: () => setEditing(true),
    onDrop: (keys) => save(keys),
    canMerge: (d, t) => isIconKey(d) && (isIconKey(t) || byKey.get(t)?.kind === 'folder'),
    onMerge: (d, t, order) => {
      const r = dropIntoFolder(order, folders, d, t);
      // Both icons leave the top level (they're in the folder now), not kept as hidden.
      save(r.keys, t.startsWith('folder:') ? [d] : [d, t], r.folders);
    },
  });

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !adding && !open) setEditing(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, adding, open]);

  const badgeOf = (t: Tile): Badge | undefined =>
    t.kind === 'app'
      ? badges[t.app.id]
      : t.kind === 'folder'
        ? sumBadges(t.items.map((i) => badges[i.key]))
        : undefined;

  const removeWidget = (key: string) => {
    const before = saved ?? visible;
    save(
      visible.filter((k) => k !== key),
      [key],
    );
    toast({
      message: 'Widget removed',
      action: { label: 'Undo', onClick: () => setLayout.mutate({ layout: before }, { onError }) },
    });
  };

  const removeFolder = (t: Extract<Tile, { kind: 'folder' }>) => {
    const f = folders[t.id];
    if (!f) return;
    const keys = visible.flatMap((k) => (k === t.key ? f.apps : [k]));
    const rest = { ...folders };
    delete rest[t.id];
    save(keys, [t.key], rest);
    toast({ message: `${t.name} removed. Its apps are back on the screen.` });
  };

  const removeApp = (tile: Extract<Tile, { kind: 'app' }>) => {
    const { id, name } = tile.app;
    setInstall.mutate(
      { id, patch: { enabled: false } },
      {
        onError,
        onSuccess: () =>
          toast({
            message: `${name} removed from the screen. Its data is kept.`,
            action: {
              label: 'Undo',
              onClick: () => setInstall.mutate({ id, patch: { enabled: true } }, { onError }),
            },
          }),
      },
    );
  };

  const addWidget = (key: string) => {
    save([key, ...visible]);
    setAdding(false);
    toast({ message: 'Widget added' });
  };

  const openIcon = useCallback(
    (to: string, iconEl: HTMLElement | null) => launchFrom(iconEl, () => navigate(to)),
    [navigate],
  );

  const tileProps = (t: Tile, i: number) => ({
    tile: t,
    editing,
    ink,
    tone,
    alt: i % 2 === 1,
    badge: badgeOf(t),
    merging: drag.mergeTarget === t.key,
    onNudge: (by: number) => drag.nudge(t.key, by),
    onOpenIcon: openIcon,
    onOpenFolder: (id: string, origin: DOMRect | null) => setOpen({ id, origin }),
  });

  const ghostTile = drag.ghost ? byKey.get(drag.ghost.key) : undefined;
  const openFolder = open ? byKey.get(folderKey(open.id)) : undefined;

  return (
    <>
      <div
        aria-hidden
        data-testid="miniapps-wallpaper"
        className="fixed inset-0 transition-[background] lg:left-[13.5rem]"
        style={{ background: wp.background }}
      />
      <div
        className={cn('relative min-h-dvh pb-28 lg:pb-16', PAGE_FRAME)}
        // Tapping the wallpaper itself ends arranging, as on a phone.
        onClick={(e) => {
          if (editing && (e.target as HTMLElement).dataset.backdrop) setEditing(false);
        }}
        data-backdrop="1"
      >
        <header className="pt-safe" data-backdrop="1">
          <div className="flex min-h-[3.5rem] items-center gap-2 pt-3 lg:pt-10" data-backdrop="1">
            <h1 className={cn('page-title mr-auto', ink)}>Miniapps</h1>
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1 rounded-full pl-2.5 pr-3 text-sm font-medium backdrop-blur-md',
                    PILL[tone],
                  )}
                >
                  <Plus className="h-4 w-4" strokeWidth={2.25} /> Widget
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className={cn(
                    'inline-flex h-8 items-center rounded-full px-3.5 text-sm font-semibold backdrop-blur-md',
                    PILL[tone],
                  )}
                >
                  Done
                </button>
              </>
            ) : (
              state.isSuccess && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className={cn(
                    'inline-flex h-8 items-center rounded-full px-3.5 text-sm backdrop-blur-md',
                    PILL[tone],
                  )}
                >
                  Edit
                </button>
              )
            )}
          </div>
        </header>

        <ul
          className="mt-6 grid grid-cols-4 gap-x-2 gap-y-6 sm:grid-cols-6 lg:grid-cols-8"
          data-backdrop="1"
          aria-label="Apps and widgets"
        >
          {drag.order.map((key, i) => {
            const t = byKey.get(key);
            if (!t) return null;
            const wide = t.kind === 'widget' || t.kind === 'clock';
            return (
              <li
                key={key}
                {...drag.bind(key)}
                data-tile={key}
                className={cn(
                  'relative select-none [-webkit-touch-callout:none]',
                  wide && 'col-span-4',
                  editing && 'touch-none',
                  drag.dragging === key && 'opacity-0',
                )}
              >
                <TileView {...tileProps(t, i)} />
                {editing && t.kind !== 'builtin' && (
                  <RemoveBadge
                    wide={wide}
                    label={
                      t.kind === 'app'
                        ? `Remove ${t.app.name} from the screen`
                        : t.kind === 'folder'
                          ? `Remove the ${t.name} folder (its apps stay)`
                          : `Remove the ${t.kind === 'clock' ? 'clock' : t.app.name} widget`
                    }
                    onRemove={() =>
                      t.kind === 'app'
                        ? removeApp(t)
                        : t.kind === 'folder'
                          ? removeFolder(t)
                          : removeWidget(t.key)
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>

        {state.isSuccess && apps.length === 0 && (
          <p className={cn('mt-10 text-sm opacity-80', ink)}>
            Nothing here yet. Get miniapps in the Store.
          </p>
        )}
      </div>

      {drag.ghost && ghostTile && (
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-50"
          style={{
            width: drag.ghost.width,
            height: drag.ghost.height,
            transform: `translate(${drag.ghost.x}px, ${drag.ghost.y}px) scale(1.08)`,
          }}
        >
          <TileView {...tileProps(ghostTile, 0)} editing lifted merging={false} />
        </div>
      )}

      {openFolder?.kind === 'folder' && (
        <FolderView
          name={openFolder.name}
          items={openFolder.items}
          origin={open?.origin ?? null}
          tone={tone}
          ink={ink}
          badges={badges}
          editing={editing}
          onClose={() => setOpen(null)}
          onRename={(name) => {
            const f = folders[openFolder.id];
            if (f) save(visible, undefined, { ...folders, [openFolder.id]: { ...f, name } });
          }}
          onTakeOut={(key) => {
            const r = takeOutOfFolder(visible, folders, openFolder.id, key);
            save(r.keys, undefined, r.folders);
            if (!r.folders[openFolder.id]) setOpen(null);
          }}
          onOpen={(t, el) => {
            setOpen(null);
            openIcon(iconLookOf(t).to, el);
          }}
        />
      )}

      <AddWidgetDialog
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={addWidget}
        available={[
          ...(byKey.has(CLOCK_KEY) ? [] : [CLOCK_KEY]),
          ...apps.filter((a) => a.Widget && !byKey.has(widgetKey(a.id))).map((a) => a.id),
        ]}
      />
    </>
  );
}

const LABEL = 'max-w-full truncate px-1 text-[0.8125rem] leading-4';

/** One tile's picture: an icon or folder with its name, a widget card, or the clock. */
function TileView({
  tile,
  editing,
  ink,
  tone,
  alt,
  lifted,
  badge,
  merging,
  onNudge,
  onOpenIcon,
  onOpenFolder,
}: {
  tile: Tile;
  editing: boolean;
  ink: string;
  tone: Tone;
  alt?: boolean;
  /** Being dragged: no wobble, no label. */
  lifted?: boolean;
  badge?: Badge;
  /** A dragged icon is held over this one: it is about to become (or join) a folder. */
  merging: boolean;
  onNudge: (by: number) => void;
  onOpenIcon: (to: string, iconEl: HTMLElement | null) => void;
  onOpenFolder: (id: string, origin: DOMRect | null) => void;
}) {
  const jiggle = editing && !lifted && cn('tile-jiggle', alt && 'tile-jiggle-b');
  const onKeyDown = (e: KeyboardEvent) => {
    if (!editing) return;
    const by = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (by) {
      e.preventDefault();
      onNudge(by);
    }
  };

  if (tile.kind === 'clock')
    return (
      <div
        tabIndex={editing ? 0 : -1}
        onKeyDown={onKeyDown}
        aria-label="Clock widget"
        className={cn('min-h-[6.5rem] rounded-[1.25rem]', jiggle)}
        style={{ ['--jiggle' as string]: '0.35deg' }}
      >
        <ClockWidget ink={ink} />
      </div>
    );

  if (tile.kind === 'widget') {
    const Widget = tile.app.Widget!;
    return (
      <div
        className={cn('flex flex-col items-center gap-1.5', jiggle)}
        style={{ ['--jiggle' as string]: '0.35deg' }}
      >
        <div
          className={cn(
            'relative flex min-h-[6.5rem] w-full items-center p-4',
            GLASS,
            lifted && 'shadow-[0_14px_34px_-8px_rgb(0_0_0/0.5)]',
          )}
        >
          <div className="w-full min-w-0">
            <MiniappRuntime definition={tile.app} place="widget">
              <Widget />
            </MiniappRuntime>
          </div>
          {/* While arranging, a widget is something to move, not to use. */}
          {editing && (
            <div
              tabIndex={0}
              onKeyDown={onKeyDown}
              aria-label={`${tile.app.name} widget`}
              className="absolute inset-0 z-10 rounded-[1.25rem]"
            />
          )}
        </div>
        <Link
          to={`/miniapps/${tile.app.id}`}
          draggable={false}
          tabIndex={editing ? -1 : 0}
          onClick={(e) => editing && e.preventDefault()}
          className={cn(LABEL, ink)}
        >
          {tile.app.name}
        </Link>
      </div>
    );
  }

  // An icon or a folder: same size, same label.
  const isFolder = tile.kind === 'folder';
  const look = isFolder ? null : iconLookOf(tile as IconTile);
  const name = isFolder ? tile.name : look!.name;
  const onClick = (e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    e.preventDefault();
    const iconEl = e.currentTarget.querySelector<HTMLElement>('[data-icon]');
    if (isFolder) onOpenFolder(tile.id, iconEl?.getBoundingClientRect() ?? null);
    else if (!editing) onOpenIcon(look!.to, iconEl);
  };
  const picture = (
    <span
      className={cn(
        'relative inline-flex transition-transform duration-150',
        jiggle,
        merging && 'scale-110',
      )}
    >
      {isFolder ? (
        <FolderIcon items={tile.items} tone={tone} />
      ) : (
        <>
          {/* Held over an icon: a folder plate appears behind it. */}
          {merging && (
            <span className="absolute -inset-1.5 rounded-[1.4rem] bg-white/25 backdrop-blur-xl" />
          )}
          <MiniappIcon
            {...look!}
            className={cn(
              !editing && 'transition-transform duration-100 group-active:scale-[0.92]',
            )}
          />
        </>
      )}
      {badge !== undefined && !lifted && <BadgeDot value={badge} />}
    </span>
  );
  const label = <span className={cn(LABEL, ink, lifted && 'opacity-0')}>{name}</span>;
  const cls = 'group flex w-full flex-col items-center gap-1.5 rounded-md py-1 outline-offset-2';

  return isFolder ? (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={`${name} folder, ${tile.items.length} apps`}
      className={cls}
    >
      {picture}
      {label}
    </button>
  ) : (
    <Link
      to={look!.to}
      draggable={false}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={editing ? `${name}, arrange with arrow keys` : undefined}
      className={cls}
    >
      {picture}
      {label}
    </Link>
  );
}

/** The small "minus" on a tile while arranging. */
function RemoveBadge({
  wide,
  label,
  onRemove,
}: {
  wide: boolean;
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onRemove}
      className={cn(
        'absolute z-20 flex h-6 w-6 items-center justify-center rounded-full bg-[#e6e8ec] text-[#1d222b] shadow-[0_1px_4px_rgb(0_0_0/0.35)] active:scale-90',
        // Over the icon's top-left corner, or the widget's.
        wide ? '-left-1.5 -top-1.5' : 'left-[calc(50%-2.25rem)] top-0',
      )}
    >
      <Minus className="h-3.5 w-3.5" strokeWidth={3} />
    </button>
  );
}

/** "Add a widget": the clock and the widgets of apps on the screen that aren't shown yet. */
function AddWidgetDialog({
  open,
  onClose,
  onAdd,
  available,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (key: string) => void;
  /** CLOCK_KEY or app ids. */
  available: string[];
}) {
  const apps = enabledApps(useMiniappState().data);
  return (
    <Dialog open={open} onClose={onClose} title="Add a widget">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {available.length === 0 && (
          <p className="text-sm text-ink-muted">
            Every widget is already on your screen.{' '}
            <Link to="/miniapps/store" onClick={onClose} className="text-accent hover:underline">
              Find more apps in the Store
            </Link>
            .
          </p>
        )}
        {available.map((k) => {
          const app = k === CLOCK_KEY ? null : apps.find((a) => a.id === k);
          if (k !== CLOCK_KEY && !app) return null;
          const Widget = app?.Widget;
          const name = app ? app.name : 'Clock';
          return (
            <section key={k}>
              <div className="flex items-center gap-3">
                <MiniappIcon {...(app ? app.icon : CLOCK_ICON)} app={app ?? undefined} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{name}</p>
                  <p className="text-xs text-ink-faint">
                    {app ? 'Widget' : 'The time and date, large'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(app ? widgetKey(app.id) : CLOCK_KEY)}
                  className="inline-flex h-8 items-center gap-1 rounded bg-accent-strong px-3 text-sm font-medium text-accent-ink hover:bg-accent-strong/85"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.25} /> Add
                </button>
              </div>
              <div
                aria-hidden
                ref={(el) => el?.setAttribute('inert', '')}
                className="pointer-events-none mt-3 select-none rounded-lg border border-line bg-surface p-3"
              >
                {app && Widget ? (
                  <MiniappRuntime definition={app} place="widget">
                    <Widget />
                  </MiniappRuntime>
                ) : (
                  <ClockWidget ink="text-ink" />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </Dialog>
  );
}
