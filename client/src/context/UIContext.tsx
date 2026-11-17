import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { CaptureKind } from '../../../shared/types';

interface CaptureSeed {
  text?: string;
  kind?: CaptureKind;
}

/**
 * What the big plus in the phone navigation does on the page on screen: the page's own most
 * common "new" action. Pages register it with `useQuickAction`; with none, it opens Quick
 * Capture.
 */
export interface QuickAction {
  /** Accessible name of the plus button, e.g. "New journal entry". */
  label: string;
  run: () => void;
}

interface QuickActionEntry {
  id: number;
  priority: number;
  label: string;
  run: { current: () => void };
}

interface UIValue {
  captureOpen: boolean;
  captureSeed: CaptureSeed | null;
  openCapture: (seed?: CaptureSeed) => void;
  closeCapture: () => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  /** The current page's quick action, if it has one. */
  quickAction: QuickAction | null;
  registerQuickAction: (entry: QuickActionEntry) => () => void;
}

const UIContext = createContext<UIValue | null>(null);

/** App-wide overlays (Quick Capture, Search) that any page or shortcut can open. */
export function UIProvider({ children }: { children: ReactNode }) {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureSeed, setCaptureSeed] = useState<CaptureSeed | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const openCapture = useCallback((seed?: CaptureSeed) => {
    setSearchOpen(false);
    setCaptureSeed(seed ?? null);
    setCaptureOpen(true);
  }, []);
  const closeCapture = useCallback(() => setCaptureOpen(false), []);
  const openSearch = useCallback(() => {
    setCaptureOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const [quickEntries, setQuickEntries] = useState<QuickActionEntry[]>([]);
  const registerQuickAction = useCallback((entry: QuickActionEntry) => {
    setQuickEntries((list) => [...list.filter((e) => e.id !== entry.id), entry]);
    return () => setQuickEntries((list) => list.filter((e) => e.id !== entry.id));
  }, []);
  // The highest priority wins (a page over a header it shares with other pages); then the latest.
  const quickAction = useMemo<QuickAction | null>(() => {
    const top = quickEntries.reduce<QuickActionEntry | null>(
      (best, e) => (!best || e.priority >= best.priority ? e : best),
      null,
    );
    return top ? { label: top.label, run: () => top.run.current() } : null;
  }, [quickEntries]);

  const value = useMemo(
    () => ({
      captureOpen,
      captureSeed,
      openCapture,
      closeCapture,
      searchOpen,
      openSearch,
      closeSearch,
      quickAction,
      registerQuickAction,
    }),
    [
      captureOpen,
      captureSeed,
      openCapture,
      closeCapture,
      searchOpen,
      openSearch,
      closeSearch,
      quickAction,
      registerQuickAction,
    ],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}

let nextQuickId = 1;

/**
 * Make the phone navigation's plus button run `run` while this component is mounted. Pass
 * `null` as the label to register nothing (e.g. while the action isn't available). Use
 * `priority: 1` in a page that sits inside a shared header which registers its own action.
 */
export function useQuickAction(
  label: string | null,
  run: () => void,
  { priority = 0 }: { priority?: number } = {},
) {
  const { registerQuickAction } = useUI();
  const runRef = useRef(run);
  runRef.current = run;
  const [id] = useState(() => nextQuickId++);
  useEffect(() => {
    if (label === null) return;
    return registerQuickAction({ id, priority, label, run: runRef });
  }, [registerQuickAction, id, priority, label]);
}

/** For quick actions that start typing: bring the field into view and put the cursor in it. */
export function focusForTyping(el: HTMLInputElement | HTMLTextAreaElement | null | undefined) {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const end = el.value.length;
  try {
    el.setSelectionRange(end, end);
  } catch {
    // Some input types (date, number) don't support a selection.
  }
}

const FIELD =
  'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]),textarea';

/**
 * Focus the first text field inside `container`. Pass a function for a container that the same
 * action is about to render (it is looked up again on the next frame).
 */
export function focusFirstFieldIn(
  container: HTMLElement | null | undefined | (() => HTMLElement | null | undefined),
  { emptyFirst = false, selector = FIELD }: { emptyFirst?: boolean; selector?: string } = {},
) {
  const get = typeof container === 'function' ? container : () => container;
  const run = () => {
    const el = get();
    if (!el) return false;
    const fields = [...el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector)];
    focusForTyping((emptyFirst && fields.find((f) => !f.value.trim())) || fields[0]);
    return true;
  };
  if (!run()) requestAnimationFrame(() => void run());
}
