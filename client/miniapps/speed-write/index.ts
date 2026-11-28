import { lazy } from 'react';
import { defineMiniapp } from '@miniapp/sdk';
import { SpeedGlyph } from './Icon';
import { INITIAL, merge, type SpeedData } from './logic';

export default defineMiniapp<SpeedData>({
  id: 'speed-write',
  name: 'Speed write',
  description: 'Train fast typing on fresh text every time, with live speed and stats.',
  about: [
    'A new, different text every run: words, sentences and short lines, never the same twice.',
    'Your text fills in as you type, with mistakes marked so you can fix them at once.',
    'Switch numbers, currency and other signs, apostrophes, punctuation and capitals on or off.',
    'Speed, accuracy and time for every run, your best, a trend and your recent runs, split by computer and phone.',
    'Delete any run: right click, long press, or the three dots.',
  ],
  icon: { glyph: SpeedGlyph, background: '#4f46e5' },
  App: lazy(() => import('./App')),
  Widget: lazy(() => import('./Widget')),
  initialData: INITIAL,
  merge,
});
