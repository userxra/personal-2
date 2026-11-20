import { useEffect } from 'react';

/**
 * Colours the phone's status bar (the page's `theme-color`) while the component is on screen,
 * for an app whose top is a colour of its own. Back to the site's colour when it goes.
 */
export function useStatusBarColor(color: string | null) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta || !color) return;
    meta.setAttribute('content', color);
    return () => {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      if (bg) meta.setAttribute('content', `rgb(${bg.split(/\s+/).join(', ')})`);
    };
  }, [color]);
}
