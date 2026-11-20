# Design system

Goal: a calm, personal notebook. It must **not** look like a generic AI-made or corporate productivity app. No gamification (XP, streaks, badges), no card walls, no gratuitous animation.

## Tokens (`client/src/index.css`, `client/tailwind.config.js`)

- Colors are CSS variables as RGB triplets so Tailwind can apply opacity: `bg surface surface-2 raised line line-strong ink ink-muted ink-faint accent accent-strong accent-ink ok warn bad chart-1 chart-2`. Dark is the default (`:root`); light is `:root.light`, chosen per device (`ThemeContext`).
- Use tokens, never raw hex, in components. Chart colors were validated for contrast and colour-blind separation (dark `#6c93dc`/`#3d5ea8`, light `#3a62b3`/`#7395dc`); don't change them without re-validating.
- Radii are small on purpose: `sm 2px, DEFAULT 3px, md 4px, lg 6px`. Nothing bubbly.
- Type: **Source Serif 4** (variable, optical size) for titles and writing; **IBM Plex Sans** for UI; both bundled through `@fontsource` (no third-party font requests). Extra size `text-2xs` (11px). Helper classes `.page-title` and `.section-label`.
- Transitions default to 120 ms.

## Layout

- Signed-in pages render inside `AppShell`: sidebar at `lg` (offset `lg:pl-[13.5rem]`), bottom `MobileNav` on phones (Home, Journal, the plus, Projects, More), hidden in editors. The plus is the page's own most common action, registered with `useQuickAction` (`context/UIContext.tsx`; helpers `focusForTyping`, `focusFirstFieldIn`), and Quick Capture where a page has none. Its accessible name is the action's name.
- **All pages share one content frame**: `PAGE_FRAME` in `components/shell/PageHeader.tsx` (`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10`). `<Page width="narrow|default|wide">` limits how far a page extends to the right but always starts at the frame's left edge. Never center a page independently or add per-page left offsets; that was the cause of horizontal jumps between sections. `html` has `scrollbar-gutter: stable` for the same reason (fine pointers only; touch screens hide scrollbars).
- Journal/note editors (`EditorPage`) are a deliberate exception: a centered full-screen writing view.
- Mobile is first class: 16 px gutters, large touch targets (`h-10`/`h-9` on phones, smaller from `sm`), no horizontal overflow.
- Installed app on phones: the page background, the bottom navigation and the `theme-color` meta are the same colour (`--bg`), so Android's status bar matches; `ThemeContext` keeps the meta in step with dark/light, and overlays never change it. Fixed-height bars add the notch: `h-[calc(3.5rem+env(safe-area-inset-top))]` with `pt-safe`, or `pt-safe` on a wrapper around an `h-14` bar; bottom bars use `pb-safe`.
- Touch (`index.css`): no browser overscroll (`overscroll-behavior: none` on `html`/`body`; inner `overflow-*-auto` areas contain theirs), `touch-action: manipulation`, and on coarse pointers controls (buttons, links, nav, ARIA controls) aren't selectable and show no callout, while `.prose-entry`, inputs and editable text stay selectable. Small icon buttons get a 44 px hit area with `.touch-target` (an invisible `::before`; `IconButton` has it). Rows, header buttons and the bottom nav show a pressed state (`active:`).

## Components (`client/src/components`)

- `ui/`: `Button`/`IconButton`, `Checkbox`, `Dialog`, `Field` (`Input`, `Textarea`, `controlClass`), `Menu` (+ `PointMenu` for right-click / long-press menus at a point), `AutoSaveText`, `Skeleton` (+ `SkeletonText`, `SkeletonBlock`), `MetadataDialog` (+ `timeRow`; read-only facts in labelled sections, used by entries, files and folders), and in `misc.tsx` `Loading`, `Empty`, `ErrorNote`, `TabLinks`, `Segmented`, `Kbd`.
- Miniapps screen (`features/miniapp-host`): the one deliberate exception to small radii and flat surfaces. App icons are squircles (`MiniappIcon`: superellipse in SVG, a clear colour or two-colour gradient, large glyph at 58%, or with `fill` a whole picture cut to the squircle; no shadow or bevel; an app's `liveIcon` can change the picture and colour with its data); folders are frosted squircles of mini icons; badges are `#ff3b30` circles, widgets are frosted cards (`bg-surface` at 86%, blur, 20px radius), buttons on the wallpaper are round pills, and the mobile bottom bar is frosted and tinted to the wallpaper there (`MobileNav` `LOOKS`). Tiles wobble while arranging (`.tile-jiggle`, off with reduced motion).
- Writing: entry bodies, belief positions and the reading view share one type (`features/entries/writingStyle.ts`, `.prose-entry`). The format bar lights a button (`bg-accent/15`, accent icon) when its formatting is applied at the selection; pressing it again removes it. Words linked to a file or folder are a dotted underline with a small paperclip/folder icon (`.entry-anchor` and `a[href^="doc:"]` in `index.css`), the same while writing and reading.
- Loading: pages use skeletons, not spinners. A `Skeleton` group is invisible for 150 ms (fast loads show nothing), fades in, and its bars pulse slowly in step (opacity, 2.4 s); with reduced motion they are still. Bars are `ink` at 7.5% opacity, so they work in both themes. `SkeletonText` takes the real line's type classes and so its exact height. Keep real headings, labels and controls outside the skeleton; only unknown values become bars. `Loading` (a delayed "Loading…" line) remains for dialogs, previews and code-split chunks inside a page.
- `shell/`: `AppShell`, `Sidebar`, `MobileNav`, `PageHeader` (+ `Page`, `PAGE_FRAME`), `nav.ts` (single list of sections; `short` label for the phone bar).
- Prefer these over new one-offs. Lists are rows separated by hairlines, not boxed cards. Section headings use `.section-label`.

## Conventions

- Tailwind only. `cn()` from `lib/cn` for conditional classes.
- Facts, not scores: progress is "2 of 5 tasks done", never a percentage badge; a passed target date is stated plainly, not flagged red. Only real deadlines can be "overdue".
- Destructive actions confirm via `ConfirmContext`; errors surface via `ToastContext` or inline `ErrorNote`.
- Charts follow the validated-palette approach (see the `dataviz` skill if available) and offer a table view.
