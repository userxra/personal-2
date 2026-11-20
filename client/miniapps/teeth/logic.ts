import { addDays, dayKey } from '@miniapp/sdk';
import type { FlameTier } from './art';

/** Brushing data, saved to the account. */
export interface BrushData {
  v: 1;
  /** Day (YYYY-MM-DD, days start at 03:00) → when each brush was logged (ISO time). */
  days: Record<string, { m?: string; e?: string }>;
  /** The look of the Brush screen: light (the default), dark, or the same as the site. */
  look?: Look;
}

export type Look = 'light' | 'dark' | 'site';

export const INITIAL: BrushData = { v: 1, days: {} };

/** A day runs 03:00–03:00, so brushing just after midnight still counts as the evening. */
export const DAY_START = 3;
export type Slot = 'm' | 'e';

export const todayKey = (now: Date) => dayKey(now, DAY_START);
/** Hours since the day started (03:00 = 0). */
const hourOfDay = (now: Date) => ((now.getHours() - DAY_START + 24) % 24) + now.getMinutes() / 60;
/** Morning until 15:00, evening after. */
export const currentSlot = (now: Date): Slot => (hourOfDay(now) < 12 ? 'm' : 'e');

const complete = (d?: { m?: string; e?: string }) => !!d?.m && !!d?.e;

export function setSlot(data: BrushData, day: string, slot: Slot, at: string | null): BrushData {
  const prev = data.days[day] ?? {};
  const next = { ...prev };
  if (at) next[slot] = at;
  else delete next[slot];
  const days = { ...data.days };
  if (next.m || next.e) days[day] = next;
  else delete days[day];
  return { ...data, days };
}

/** Both devices' logs together (after being offline): a brush logged anywhere counts. */
export function merge(a: BrushData, b: BrushData): BrushData {
  const days: BrushData['days'] = { ...a.days };
  for (const [k, v] of Object.entries(b.days)) days[k] = { ...days[k], ...v };
  const look = b.look ?? a.look;
  return look ? { v: 1, days, look } : { v: 1, days };
}

export interface Stats {
  today: { m?: string; e?: string };
  yesterday: { m?: string; e?: string };
  /** Full days (morning and evening) in a row, up to today if today is full, else up to yesterday. */
  streak: number;
  best: number;
  total: number;
  /** Days in a row, before today, with at least one brush missing (since the first log). */
  missedDays: number;
  /**
   * When only yesterday is missing: the full days in a row before it. Logging yesterday brings
   * them back, so Molar is frozen rather than reset.
   */
  frozenStreak: number;
  firstDay: string | null;
}

export function stats(data: BrushData, now: Date): Stats {
  const t = todayKey(now);
  const keys = Object.keys(data.days).sort();
  const firstDay = keys[0] ?? null;
  let streak = 0;
  for (
    let d = complete(data.days[t]) ? t : addDays(t, -1);
    complete(data.days[d]);
    d = addDays(d, -1)
  )
    streak++;
  let best = 0;
  let run = 0;
  if (firstDay)
    for (let d = firstDay; d <= t; d = addDays(d, 1)) {
      run = complete(data.days[d]) ? run + 1 : 0;
      best = Math.max(best, run);
    }
  let missedDays = 0;
  if (firstDay)
    for (let d = addDays(t, -1); d >= firstDay && !complete(data.days[d]); d = addDays(d, -1))
      missedDays++;
  let frozenStreak = 0;
  if (missedDays === 1)
    for (let d = addDays(t, -2); complete(data.days[d]); d = addDays(d, -1)) frozenStreak++;
  const total = Object.values(data.days).reduce((n, v) => n + (v.m ? 1 : 0) + (v.e ? 1 : 0), 0);
  return {
    today: data.days[t] ?? {},
    yesterday: data.days[addDays(t, -1)] ?? {},
    streak,
    best,
    total,
    missedDays,
    frozenStreak,
    firstDay,
  };
}

export type Mood =
  | 'hello'
  | 'happy'
  | 'content'
  | 'waiting'
  | 'annoyed'
  | 'worried'
  | 'frozen'
  | 'angry'
  | 'furious';

const LINES: Record<Mood, string[]> = {
  hello: ["Hi, I'm Molar. Brush me twice a day and we'll get along fine."],
  happy: [
    'Two for two. Sparkling.',
    'Look at that shine. Proud of you.',
    'Morning and evening. This is how legends are made.',
  ],
  content: [
    'Good start. See you tonight.',
    "Morning done. Don't forget me later.",
    'Fresh. Now keep it up this evening.',
  ],
  waiting: [
    'Morning! Brush before you do anything else.',
    'Rise and brush.',
    "I'm waiting. Toothbrush. Now.",
  ],
  annoyed: [
    "It's getting late. You know what to do.",
    'Bed without brushing? Over my enamel.',
    'I can still taste dinner. Can you? Brush.',
  ],
  worried: [
    'Our {n}-day streak ends at 3 am. Evening brush, please.',
    '{n} days in a row. Please not tonight. Brush.',
    "I'm sweating here. {n} days, and the night is running out.",
  ],
  frozen: [
    "I'm frozen. Brushed yesterday and forgot to log it?",
    'Brrr. Log yesterday and our {n} days thaw out.',
    "Yesterday is missing. If you brushed, log it and I'll warm up.",
  ],
  angry: [
    'You skipped yesterday. I noticed. I always notice.',
    "Yesterday you forgot me. Today you won't.",
    'One missed brush becomes two. Brush now.',
  ],
  furious: [
    'Days without a full brush. Your enamel is filing a complaint.',
    "I've seen cavities with more discipline.",
    'This is an intervention. Toothbrush. NOW.',
  ],
};

/** How Molar feels, and what it says. The line changes each day, not each look. */
export function moodOf(s: Stats, now: Date): { mood: Mood; line: string } {
  const h = hourOfDay(now); // 0 = 03:00
  // Late with a brush missing: worried for a real streak (3+ days), annoyed otherwise.
  const late = s.streak >= 3 ? 'worried' : 'annoyed';
  let mood: Mood;
  if (!s.firstDay) mood = 'hello';
  else if (s.today.m && s.today.e) mood = 'happy';
  else if (s.missedDays >= 2) mood = 'furious';
  else if (s.missedDays === 1) mood = s.frozenStreak > 0 ? 'frozen' : 'angry';
  else if (s.today.m)
    mood = h >= 18 ? late : 'content'; // after 21:00, no evening yet
  else mood = h >= 8 ? late : 'waiting'; // after 11:00, no morning yet
  const lines = LINES[mood];
  const seed = Number(todayKey(now).replaceAll('-', '')) % lines.length;
  const n = mood === 'frozen' ? s.frozenStreak : s.streak;
  return { mood, line: lines[seed]!.replaceAll('{n}', String(n)) };
}

export type StageId =
  'milk' | 'little' | 'molar' | 'athlete' | 'blazing' | 'royal' | 'golden' | 'diamond';

/** Molar's forms, by full days in a row. */
export const STAGES: readonly { id: StageId; name: string; from: number }[] = [
  { id: 'milk', name: 'Milk Tooth', from: 0 },
  { id: 'little', name: 'Little Molar', from: 1 },
  { id: 'molar', name: 'Molar', from: 3 },
  { id: 'athlete', name: 'Athlete', from: 7 },
  { id: 'blazing', name: 'Blazing', from: 14 },
  { id: 'royal', name: 'Royal', from: 30 },
  { id: 'golden', name: 'Golden', from: 100 },
  { id: 'diamond', name: 'Diamond', from: 365 },
];

/**
 * The streak Molar's form shows: the current one, or, while frozen, the one that logging
 * yesterday would bring back.
 */
export const formStreak = (s: Stats, mood: Mood) => (mood === 'frozen' ? s.frozenStreak : s.streak);

/** Molar's form for a streak, and the next one (null at the top). */
export function stageOf(streak: number) {
  let i = 0;
  while (i + 1 < STAGES.length && streak >= STAGES[i + 1]!.from) i++;
  return { stage: STAGES[i]!, next: STAGES[i + 1] ?? null };
}

/** The streak badges: each flame and the full days in a row it takes. */
export const BADGES: readonly { tier: FlameTier; from: number }[] = [
  { tier: 'spark', from: 3 },
  { tier: 'orange', from: 7 },
  { tier: 'red', from: 14 },
  { tier: 'magenta', from: 30 },
  { tier: 'gold', from: 100 },
  { tier: 'crystal', from: 365 },
];

/**
 * The flame by the streak number, from day 3: yellow, orange, red, magenta, then gold at 100
 * and crystal at 365. Grey while today is at risk, frost while frozen, none below 3 days.
 */
export function flameOf(streak: number, mood: Mood): FlameTier | null {
  if (mood === 'frozen') return 'frost';
  if (streak < 3) return null;
  if (mood === 'worried') return 'grey';
  if (streak >= 365) return 'crystal';
  if (streak >= 100) return 'gold';
  if (streak >= 30) return 'magenta';
  if (streak >= 14) return 'red';
  if (streak >= 7) return 'orange';
  return 'spark';
}

/**
 * Brushes due by now and not logged, for the icon's badge: the morning one all day, the evening
 * one from 18:00.
 */
export function dueNow(data: BrushData, now: Date): number {
  const today = data.days[todayKey(now)] ?? {};
  return (today.m ? 0 : 1) + (!today.e && hourOfDay(now) >= 15 ? 1 : 0);
}

/** When a brush logged later for a past day is filed: 08:00 or 21:00 that day. */
export function pastTime(day: string, slot: Slot): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, m! - 1, d!, slot === 'm' ? 8 : 21).toISOString();
}

/** Brushes logged and possible in a set of days (up to today; days before the first log don't count). */
export function tally(data: BrushData, days: string[], today: string, firstDay: string | null) {
  const counted = days.filter((d) => d <= today && firstDay !== null && d >= firstDay);
  const done = counted.reduce(
    (n, d) => n + (data.days[d]?.m ? 1 : 0) + (data.days[d]?.e ? 1 : 0),
    0,
  );
  return { done, possible: counted.length * 2 };
}
