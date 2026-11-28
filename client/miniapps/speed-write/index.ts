import { lazy } from 'react';
import { Keyboard } from 'lucide-react';
import { defineMiniapp } from '@miniapp/sdk';
import { INITIAL, merge, type SpeedData } from './logic';

export default defineMiniapp<SpeedData>({
  id: 'speed-write',
  name: 'Speed write',
  description: 'Train fast typing on fresh text every time, with live speed and stats.',
  about: [
    'A new, different text every run: words, sentences and short lines, never the same twice.',
    'Your text fills in as you type, with mistakes marked so you can fix them at once.',
    'Switch numbers, currency and other signs, apostrophes, punctuation and capitals on or off.',
    'Speed, accuracy and time for every run, your best, a trend and your recent runs.',
  ],
  icon: {
    glyph: Keyboard,
    background: '#5b5bd6',
    gradient: ['#8a7dff', '#4a47c4'],
  },
  App: lazy(() => import('./App')),
  Widget: lazy(() => import('./Widget')),
  initialData: INITIAL,
  merge,
});
