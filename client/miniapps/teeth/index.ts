import { lazy } from 'react';
import { defineMiniapp } from '@miniapp/sdk';
import { LOOKS } from './art';
import {
  dueNow,
  formStreak,
  INITIAL,
  merge,
  moodOf,
  stageOf,
  stats,
  type BrushData,
} from './logic';
import { molarGlyph } from './Molar';

export default defineMiniapp<BrushData>({
  id: 'teeth',
  name: 'Brush',
  description:
    'Track brushing your teeth, morning and evening. Molar the tooth grows with your streak, and gets mad when you skip.',
  about: [
    'Two buttons a day: morning and evening. A day runs from 3 am, so a late brush still counts.',
    'Molar grows with your streak: eight forms, from Milk Tooth to Golden at 100 days and Diamond at a year.',
    'A streak flame that changes colour at 3, 7, 14, 30, 100 and 365 days.',
    'Forgot to log? Tap any earlier day to add or fix it, as far back as you like.',
    'The last two weeks at a glance, and every month in a calendar when you want more.',
    "The icon is Molar's face: his form, and how he feels right now. A badge when a brush is due.",
  ],
  icon: { glyph: molarGlyph('molar', 'happy'), background: LOOKS.molar.icon, fill: true },
  liveIcon: (data, now) => {
    const s = stats(data, now);
    const { mood } = moodOf(s, now);
    const { stage } = stageOf(formStreak(s, mood));
    return { glyph: molarGlyph(stage.id, mood), background: LOOKS[stage.id].icon };
  },
  badge: dueNow,
  App: lazy(() => import('./App')),
  Widget: lazy(() => import('./Widget')),
  initialData: INITIAL,
  merge,
});
