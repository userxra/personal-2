import { Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Outlet, useLocation, useMatch } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { Skeleton, SkeletonText, skeletonWidth } from '../ui/Skeleton';
import { Page } from './PageHeader';
import { CaptureDialog } from '../../features/capture/CaptureDialog';
import { useActivityTracking } from '../../features/profile/activityTracker';
import { SearchDialog } from '../../features/search/SearchDialog';
import { TaskDetailHost } from '../../features/tasks/TaskDetail';
import { useRealtime } from '../../hooks/useRealtime';
import { isMod, isTyping, useKeydown } from '../../lib/hotkeys';
import { sectionOf } from '../../lib/sections';
import { MobileNav } from './MobileNav';
import { PullToRefresh } from './PullToRefresh';
import { Sidebar } from './Sidebar';

/**
 * Navigation around the page area. Also shown on its own while the session is being checked,
 * so opening the site shows its structure at once instead of a blank screen.
 */
function useInEditor(): boolean {
  const journalEditor = useMatch('/journal/:id');
  const writingEditor = useMatch('/writing/:id');
  const noteEditor = useMatch('/ideas/:id');
  return !!(journalEditor || writingEditor || noteEditor);
}

export function ShellFrame({ children }: { children?: ReactNode }) {
  // Editors take the whole phone screen; no bottom bar competing with the keyboard.
  const inEditor = useInEditor();

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <main className="lg:pl-[13.5rem]">{children}</main>
      {!inEditor && <MobileNav />}
    </div>
  );
}

/** Stand-in for a page that can't render yet (session check, page code still downloading). */
export function PageSkeleton() {
  return (
    <Page>
      <Skeleton className="pt-safe">
        <div className="flex min-h-[3.5rem] items-center pt-3 lg:pt-10">
          <SkeletonText className="page-title" width="11rem" />
        </div>
        <div className="mt-8 space-y-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <SkeletonText className="font-serif text-[1.0625rem]" width={skeletonWidth(i)} />
              <SkeletonText className="mt-0.5 text-sm" width="88%" />
            </div>
          ))}
        </div>
      </Skeleton>
    </Page>
  );
}

/** Layout for signed-in pages: navigation, global shortcuts, Quick Capture and Search. */
export function AppShell({ preload }: { preload?: () => void }) {
  const { openCapture, openSearch, captureOpen, searchOpen } = useUI();
  const { user } = useAuth();

  // Fetch the other pages' code while idle, so moving between sections doesn't wait for it.
  // Safari has no requestIdleCallback; a short delay stands in for it there.
  useEffect(() => {
    if (!preload) return;
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(preload, 1500);
    return () => clearTimeout(t);
  }, [preload]);
  const inEditor = useInEditor();

  useRealtime(true);
  // Time is recorded for the section on screen (`lib/sections.ts`), encrypted entries included.
  const section = sectionOf(useLocation().pathname);
  useActivityTracking(user?.id, section);

  useKeydown((e) => {
    if (e.defaultPrevented) return;
    if (isMod(e) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
      return;
    }
    if (captureOpen || searchOpen || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey)
      return;
    if (e.key === '/') {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'c') {
      e.preventDefault();
      openCapture();
    }
  });

  return (
    <>
      <ShellFrame>
        {/* Pages load on demand inside the shell, so the navigation never disappears. */}
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </ShellFrame>
      {/* Editors own every gesture on their screen; they never pull to refresh. */}
      <PullToRefresh disabled={inEditor} />
      <CaptureDialog />
      <SearchDialog />
      <TaskDetailHost />
    </>
  );
}
