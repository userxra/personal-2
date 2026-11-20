# Miniapps

Small, optional apps that live on the **Miniapps** screen (More → Miniapps), are switched on and
off in its **Store**, and can show a **widget on Home**. They are separate from the website's own
code: the site finds them by itself, and a miniapp can only use the toolkit `@miniapp/sdk`.

This file is the recipe. To make a new miniapp, follow it; nothing outside this folder needs to
change.

## Rules

- One folder per app: `client/miniapps/<id>/`. The folder name is the app's `id`: lower-case
  letters, digits and dashes (`water`, `mood-log`). Not `store` or `wallpaper`. **Never rename it**
  once used: the app's saved data is stored under its id.
- A miniapp may import **only**: `react`, `lucide-react`, `@miniapp/sdk`, and its own files
  (`./something`). Lint fails on anything else (the site's code, other miniapps, other packages).
  The site never imports a miniapp either.
- No server code, no new pages, no changes to `client/src`. Data, routes, the Store, icons and
  widgets come from the framework.
- Inside, look like the rest of the site, not like a generated app: the site's colour tokens, its
  type (serif for big numbers and titles, sans for the rest), small radii, hairlines rather than
  boxes, no gradients, glows or glossy effects. The exception is a mascot's own artwork, which
  may be a detailed illustration with shading, light and effects (Brush's Molar).
- The icon should look like a real phone app's: a clear, confident colour (or a two-colour
  `gradient`, top left to bottom right) and a large, bold glyph. No shadows or bevels: the
  framework draws the squircle and nothing else. A custom glyph looks best as a filled white
  shape with cut-outs drawn in `var(--icon-bg)` (the icon's colour), like Brush's tooth and the
  built-in Store icon; a white icon with a full-colour picture works too (the Wallpaper icon).
  See `src/features/miniapp-host/builtins.tsx`. A lucide line icon works but looks plainer. A
  mascot app can instead fill the icon with a whole picture (`fill: true`) on one flat colour,
  like Brush.
- Keep it simple and small. Style with Tailwind classes and the site's colour tokens (`bg-surface`,
  `border-line`, `text-ink`, `text-ink-muted`, `text-ink-faint`, `text-accent`, `bg-ok/10`,
  `text-bad`…), so it works in dark and light mode. An app may have its own accent colours.
- No emojis in code. Use `lucide-react` icons or small inline SVGs.
- Mobile first: it is used mostly as an installed app on an Android phone (~390px wide).

## Files

```
client/miniapps/<id>/
  index.ts     the manifest (required)
  App.tsx      the app's screen (required)
  Widget.tsx   a small Home widget (optional)
  ...          anything else it needs (logic.ts, components)
```

### `index.ts`

```ts
import { lazy } from 'react';
import { Droplet } from 'lucide-react';
import { dayKey, defineMiniapp } from '@miniapp/sdk';

export interface WaterData {
  days: Record<string, number>;
}

export default defineMiniapp<WaterData>({
  id: 'water', // = folder name
  name: 'Water', // under the icon: one or two short words
  description: 'Count glasses of water each day.', // one sentence, under its name in the Store
  about: ['A tap per glass.', 'Your days at a glance.'], // optional: points for its Store page
  icon: {
    glyph: Droplet, // a lucide icon, or an SVG component ({ className, strokeWidth })
    background: '#2f7fd8', // the icon's colour (also var(--icon-bg) in a custom glyph)
    gradient: ['#5fb0ff', '#2a6fd0'], // optional, top left to bottom right
    // color: '#fff',       // glyph colour, default white
  },
  App: lazy(() => import('./App')),
  Widget: lazy(() => import('./Widget')), // optional
  initialData: { days: {} }, // what the app starts with before anything is saved
  badge: (d, now) => ((d.days[dayKey(now)] ?? 0) < 8 ? 1 : 0), // optional red badge on the icon
  // merge: (server, local) => ..., // optional, see "Data"
});
```

### `App.tsx`

A default-exported component. It is shown under a header with the app's icon and name and a way
back; render only the content. `Widget.tsx` is the same, but small: one or two lines and at most a
couple of buttons. It is shown in a card on Home (when "Widget on Home" is on) and, when added
with "+ Widget", in a frosted card on the miniapps screen: keep it readable on `bg-surface`.

```tsx
import { Button, dayKey, useAppData, useNow } from '@miniapp/sdk';
import type { WaterData } from './index';

export default function WaterApp() {
  const { data, update, isLoading } = useAppData<WaterData>();
  const today = dayKey(useNow());
  if (isLoading) return null;
  const n = data.days[today] ?? 0;
  return (
    <div className="space-y-4">
      <p className="font-serif text-[2rem] text-ink">{n} glasses</p>
      <Button
        variant="primary"
        onClick={() => update((d) => ({ ...d, days: { ...d.days, [today]: n + 1 } }))}
      >
        Add a glass
      </Button>
    </div>
  );
}
```

(Import types from `./index` only with `import type`, or keep them in a separate `logic.ts`, as
the `teeth` app does, so the manifest stays small.)

## The toolkit: `@miniapp/sdk`

| Export                                               | What it is                                                                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defineMiniapp(def)`                                 | Declares the app (the manifest's default export).                                                                                                          |
| `useAppData<T>()`                                    | `{ data, update, isLoading, isSaving, error }`: the app's own data, synced to the account. `update(fn)` changes it at once and saves it in the background. |
| `useMiniapp()`                                       | `{ definition, place, open }`: `place` is `'app'` or `'widget'`; `open()` opens the app's screen (from a widget).                                          |
| `useNow(everyMs?)`                                   | The current time, re-rendering each minute (and when the app comes back to the screen).                                                                    |
| `dayKey(date?, startHour?)`                          | `YYYY-MM-DD` of a moment. With `startHour` 3, 00:00 to 02:59 still counts as the day before.                                                               |
| `addDays(key, n)`, `dateOf(key)`                     | Day arithmetic on `YYYY-MM-DD` keys.                                                                                                                       |
| `Glyph`, `MiniappIconSpec` (types)                   | An icon picture component; the shape of `icon` (and of what `liveIcon` returns).                                                                           |
| `useToast()`                                         | `toast({ message, tone?: 'error', action?: { label, onClick } })`.                                                                                         |
| `Button`, `IconButton`, `Card`, `SectionLabel`, `cn` | The site's button and card styles, a section heading, class joining.                                                                                       |

## Badge

`badge(data, now)` (optional) puts a red badge on the icon: a number (things waiting), `true` (a
dot), or 0 / false / null for none. It is worked out from the app's saved data whenever the
miniapps screen shows (folders add up their apps' badges), so keep it quick and pure. Badge only
what is actually due (Brush: brushes due today and not logged).

## Live icon

`liveIcon(data, now)` (optional) changes the icon with the app's data: return the parts of `icon`
to change (`glyph`, `background`, ...), or null for the usual icon. It runs wherever the icon
shows, from the same cached data as the badge, so keep it quick and pure. Return the same glyph
component for the same picture (create them once and keep them in a `Map`), or the icon remounts
on every change. `fill: true` draws the glyph as a whole picture, edge to edge, cut to the
squircle. Brush uses both: Molar's face, in his current form and mood, on that form's colour.

## Data

- Each app has **one** JSON value (`initialData`'s shape), up to about 300 KB. It is saved to the
  owner's account and is the same on every device. Store what you need, not derived numbers
  (compute streaks and totals from the data).
- Always update with a function of the previous value: `update((d) => ({ ...d, x: d.x + 1 }))`.
  If another device saved meanwhile, the framework applies the same function again on top of
  that, so nothing is lost.
- Changes made offline are kept on the device and saved when the connection returns. If the app
  can combine its data with newer data from another device (lists, day maps), give
  `merge(server, local)`; otherwise this device's data wins.
- If the shape must change later, keep reading the old shape (or add a `v` field and convert).
  Saved data stays even when the app is removed from the screen; the Store's "Delete data"
  erases it.
- Never put passwords or secrets in miniapp data: it is not encrypted.

## Checklist

1. Create the folder and files above.
2. `npm run typecheck`, `npm run lint`, `npm run build` (from the repository root).
3. Open More → Miniapps → Store, press **Get**, open the app; tick "Widget on Home" if it has one.
4. Look at it at phone width (~390px) in dark and light mode.

## Existing miniapps

- `teeth` (**Brush**): morning and evening brushing, streaks, the last two weeks (tap a day to add
  or remove a forgotten brush), a month calendar behind "Show more" going back to the first log,
  and Molar the tooth. Molar grows with the streak through eight forms (`logic.ts` `STAGES`:
  Milk Tooth, Little Molar at 1 day, Molar 3, Athlete 7, Blazing 14, Royal 30, Golden 100,
  Diamond 365) and his face shows today (nine moods, including Worried when a 3+ day streak is at
  risk late in the evening and Frozen when only yesterday is missing). The streak flame changes
  colour at 3, 7, 14, 30, 100 and 365 days. The art is SVG built in `art.ts` from constants and
  shown by `Molar.tsx`. The screen opens on a hero (`Hero.tsx`): the streak in big numbers over the current form's colour, and every form in a row to swipe through, forms not reached shown only as an outline; below it, cards for today, the streak badges (`Badges.tsx`, flames not reached greyed out) and the history. Live icon (form and mood), widget, badge for brushes due today.
