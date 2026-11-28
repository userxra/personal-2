/** Speed write: text generation, settings, sessions and stats. Pure, no React. */

export interface Settings {
  /** Words per text. */
  len: number;
  numbers: boolean;
  symbols: boolean;
  apostrophes: boolean;
  punctuation: boolean;
  capitals: boolean;
}

export interface Session {
  /** ISO time the run ended; also its identity. */
  t: string;
  wpm: number;
  raw: number;
  /** Accuracy, 0 to 100. */
  acc: number;
  chars: number;
  secs: number;
  words: number;
  /** Where it was typed: a computer, or a touch device (phone or tablet). Absent on old runs. */
  d?: Device;
}

export type Device = 'pc' | 'touch';

export interface SpeedData {
  settings: Settings;
  sessions: Session[];
  /** Times of deleted runs, so combining with another device's data cannot bring them back. */
  gone?: string[];
}

export const LENGTHS = [10, 25, 50, 100] as const;
const MAX_SESSIONS = 400;
const MAX_GONE = 200;

export const INITIAL: SpeedData = {
  settings: {
    len: 25,
    numbers: false,
    symbols: false,
    apostrophes: true,
    punctuation: true,
    capitals: true,
  },
  sessions: [],
};

/** Combine this device's data with another's: sessions are unioned by time. */
export function merge(server: SpeedData, local: SpeedData): SpeedData {
  const gone = [...new Set([...(server.gone ?? []), ...(local.gone ?? [])])].slice(-MAX_GONE);
  const dead = new Set(gone);
  const seen = new Set<string>();
  const sessions = [...(server.sessions ?? []), ...(local.sessions ?? [])]
    .filter((s) => (dead.has(s.t) || seen.has(s.t) ? false : (seen.add(s.t), true)))
    .sort((a, b) => a.t.localeCompare(b.t))
    .slice(-MAX_SESSIONS);
  return { settings: local.settings ?? server.settings, sessions, gone };
}

export function deleteSession(d: SpeedData, t: string): SpeedData {
  return {
    ...d,
    sessions: d.sessions.filter((s) => s.t !== t),
    gone: [...(d.gone ?? []).filter((x) => x !== t), t].slice(-MAX_GONE),
  };
}

/** Undo a delete: put the run back in its place. */
export function restoreSession(d: SpeedData, s: Session): SpeedData {
  if (d.sessions.some((x) => x.t === s.t)) return d;
  return {
    ...d,
    sessions: [...d.sessions, s].sort((a, b) => a.t.localeCompare(b.t)).slice(-MAX_SESSIONS),
    gone: (d.gone ?? []).filter((x) => x !== s.t),
  };
}

export function addSession(d: SpeedData, s: Session): SpeedData {
  if (d.sessions.some((x) => x.t === s.t)) return d;
  return { ...d, sessions: [...d.sessions, s].slice(-MAX_SESSIONS) };
}

// ---------------------------------------------------------------------------
// Word pools
// ---------------------------------------------------------------------------

const split = (s: string) => s.trim().split(/\s+/);

const NOUNS = split(`
river lantern window garden mountain engine pencil bridge harbor candle mirror ladder
orchard compass blanket village kettle meadow tunnel anchor ribbon thunder shadow pocket
market letter signal island desert forest cabin carpet whistle puzzle feather bottle
canvas violin teacher farmer sailor painter baker driver pilot student doctor captain
traveler neighbor stranger cousin engineer gardener librarian musician writer
station tower castle mill barn fence path road street square corner balcony kitchen
attic cellar library museum theater cafe bakery workshop studio office classroom
storm cloud breeze frost snowfall sunrise sunset rainbow moonlight morning evening
winter summer autumn season memory idea question answer secret story rumor promise
plan habit rhythm pattern machine robot camera phone screen keyboard battery cable
wheel engine rocket planet comet star galaxy ocean wave beach cliff cave valley hill
pebble boulder crystal ember spark flame ash smoke cinnamon honey pepper lemon apple
pear plum cherry bread cheese soup noodle cookie pancake tea coffee juice basket
umbrella jacket scarf glove boot hat button zipper needle thread quilt pillow
notebook diary map ticket coin key lock door gate roof stair floor wall ceiling
horse sparrow falcon otter badger fox rabbit turtle dolphin spider beetle butterfly
lion wolf bear heron owl crow salmon trout lizard donkey goat sheep chicken
song melody drum guitar piano chorus poem novel chapter sketch statue painting
engine contract budget invoice report meeting deadline project signal network
journey adventure holiday festival parade picnic wedding concert match race
`);

const NAMES = split(
  `Maria Tom Priya Lena Omar Hugo Nina Felix Aisha Jonas Mei Carlos Ingrid Dev Sofia Leo Zara Anton Ruth Kofi`,
);

const ADJS = split(`
quiet bright ancient narrow golden hollow gentle rusty sudden crooked tiny enormous
fragile restless patient clever curious stubborn weary cheerful distant frozen
warm damp dusty polished rough smooth silent noisy crowded empty hidden famous
foreign familiar sleepy hungry generous careful clumsy nervous honest brave
wooden silver crimson pale vivid faded shiny blunt sharp heavy light steady
wild tame lonely lively bitter sweet sour salty fresh stale ordinary peculiar
`);

const VERBS_T = split(`
carried noticed painted repaired followed borrowed measured collected
remembered watched opened closed lifted dropped polished folded counted
discovered rebuilt delivered described explained chased guarded cleaned
sketched wrapped balanced mended gathered tasted traded answered
questioned invited visited photographed recorded studied planted trimmed
`);

const VERBS_I = split(`
waited wandered laughed slept arrived paused listened hesitated travelled
smiled shivered drifted wondered stumbled whispered celebrated vanished
returned lingered rested hurried trembled yawned bloomed echoed
`);

const ADVS = split(`
slowly quickly quietly carefully suddenly gladly eagerly calmly boldly
patiently gracefully nervously softly gently proudly barely nearly twice
again later tonight yesterday meanwhile eventually
`);

const PREPS = split(`
near beside behind beyond under above across along inside around toward past
`);

const DETS = split(`the this that our my her his their every each`);

const LINES = [
  'Slow is smooth, and smooth is fast.',
  'Nothing worth doing is ever done in a hurry.',
  'The quick brown fox jumps over the lazy dog.',
  'Practice a little every day and the speed will come.',
  'Keep your eyes on the words, not on your hands.',
  'A calm mind types faster than a rushed one.',
  'Rhythm matters more than raw speed.',
  'Every expert was once a beginner.',
  'Small steps still move you forward.',
  'Read ahead, breathe out, and let your fingers follow.',
  'The best time to start was yesterday, the next best is now.',
  'Mistakes are only data, so keep going.',
  'Waves wash over the rocks, and the rocks stay where they are.',
  'Good habits are built one quiet repetition at a time.',
  'Focus on accuracy first, and speed arrives on its own.',
  'We could not wait for the doors to open.',
  "It's not the destination, it's the road you take.",
  "Don't count the days, make the days count.",
  "You can't rush a good cup of tea.",
  "They didn't know what was waiting around the corner.",
  "I'm sure that she's already left the building.",
  "We'll see what happens when the sun comes up.",
  "That's the sort of thing you can't plan for.",
  "He wouldn't say where he'd hidden the key.",
  "Here's the thing nobody tells you about practice.",
  "Isn't it strange how the quiet hours go fastest?",
];

const NUMBER_PHRASES = [
  () => `${rint(2, 12)} ${pick(NOUNS)}s`,
  () => `in ${rint(1900, 2030)}`,
  () => `about ${rint(10, 99)} ${pick(NOUNS)}s`,
  () => `${rint(100, 999)} steps`,
  () => `at ${rint(1, 12)}:${String(rint(0, 59)).padStart(2, '0')}`,
  () => `${rint(2, 9)}.${rint(1, 9)} hours`,
  () => `room ${rint(10, 480)}`,
  () => `${rint(1000, 99999)} times`,
  () => `page ${rint(2, 640)}`,
  () => `${rint(3, 9)} out of ${rint(10, 20)}`,
];

const SYMBOL_PHRASES = [
  () => `for $${rint(2, 99)}.${String(rint(0, 99)).padStart(2, '0')}`,
  () => `it cost €${rint(5, 480)}`,
  () => `worth £${rint(3, 250)}`,
  () => `a fee of $${rint(100, 9999)}`,
  () => `paid €${rint(2, 90)}.${String(rint(0, 99)).padStart(2, '0')}`,
  () => `up ${rint(2, 90)}% overall`,
  () => `${rint(5, 60)}% off`,
  () => `item #${rint(1, 400)}`,
  () => `${pick(NOUNS)} & ${pick(NOUNS)}`,
  () => `${pick(NOUNS)} + ${pick(NOUNS)}`,
  () => `a ${pick(ADJS)}/${pick(ADJS)} ${pick(NOUNS)}`,
  () => `(${pick(ADVS)}, of course)`,
  () => `${pick(NOUNS)}@${pick(NOUNS)}.com`,
  () => `${rint(2, 9)} * ${rint(2, 9)} = ${rint(4, 81)}`,
  () => `¥${rint(100, 9000)} each`,
  () => `${rint(1, 9)}/${rint(2, 9)} of the way`,
];

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

function rint(a: number, b: number): number {
  return a + Math.floor(Math.random() * (b - a + 1));
}
function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const chance = (p: number) => Math.random() < p;

const np = () => {
  const adj = chance(0.55) ? `${pick(ADJS)} ` : '';
  return `${pick(DETS)} ${adj}${pick(NOUNS)}`;
};
const subject = () => (chance(0.22) ? pick(NAMES) : np());

/** One sentence from a random template, then the optional extras. */
function sentence(o: Settings): string {
  let s: string;
  const roll = Math.random();
  if (roll < 0.14) {
    s = pick(LINES);
    if (!o.apostrophes && s.includes("'")) s = pick(LINES.filter((l) => !l.includes("'")));
  } else if (roll < 0.28 && o.apostrophes) {
    const subj = pick(['we', 'they', 'she', 'he', 'you', 'I']);
    const third = subj === 'he' || subj === 'she';
    if (chance(0.5)) {
      const be = subj === 'I' ? "I'm" : third ? `${subj}'s` : `${subj}'re`;
      const tail = chance(0.5) ? pick(ADJS) : `${pick(PREPS)} ${np()}`;
      s = `${be} ${tail}.`;
    } else {
      const aux = chance(0.5) ? `${subj}'ve` : `${subj} hadn't`;
      s = `${aux} ${pick(VERBS_T)} ${np()}.`;
      if (subj === 'he' || subj === 'she') s = s.replace("'ve", "'d");
    }
  } else {
    switch (rint(0, 6)) {
      case 0:
        s = `${subject()} ${pick(VERBS_T)} ${np()}.`;
        break;
      case 1:
        s = `${subject()} ${pick(VERBS_I)} ${pick(ADVS)}.`;
        break;
      case 2:
        s = `${subject()} ${pick(VERBS_I)} ${pick(PREPS)} ${np()}.`;
        break;
      case 3:
        s = `When ${np()} ${pick(VERBS_I)}, ${subject()} ${pick(VERBS_T)} ${np()}.`;
        break;
      case 4:
        s = `${pick(ADVS)}, ${subject()} ${pick(VERBS_T)} ${np()} ${pick(PREPS)} ${np()}.`;
        break;
      case 5:
        s = `${subject()} ${pick(VERBS_T)} ${np()}, and ${np()} ${pick(VERBS_I)}.`;
        break;
      default:
        s = `${subject()} ${pick(VERBS_I)} while ${np()} ${pick(VERBS_T)} ${np()}.`;
    }
  }
  s = cap(s);

  if (o.numbers && chance(0.45)) {
    s += ` ${cap(pick(NUMBER_PHRASES)())}.`;
  }
  if (o.symbols && chance(0.45)) {
    s += ` ${cap(pick(SYMBOL_PHRASES)())}.`;
  }
  return s;
}

/** A fresh text of about `o.len` words. Never the same twice in practice. */
export function generate(o: Settings): string {
  const out: string[] = [];
  let words = 0;
  while (words < o.len) {
    let s = sentence(o);
    // Prefer a sentence that ends close to the chosen length.
    for (let k = 0; k < 8 && words + s.split(' ').length > o.len + 5; k++) s = sentence(o);
    out.push(s);
    words += s.split(' ').length;
  }
  let text = out.join(' ');
  if (!o.punctuation) text = text.replace(/[.,;:!?](?=\s|$)/g, '');
  if (!o.capitals) text = text.toLowerCase();
  return text.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export type Filter = 'all' | Device;

export function inFilter(sessions: Session[], f: Filter): Session[] {
  return f === 'all' ? sessions : sessions.filter((s) => s.d === f);
}

export function result(
  chars: number,
  keys: number,
  mistakes: number,
  ms: number,
  words: number,
): Omit<Session, 't'> {
  const mins = Math.max(ms, 300) / 60000;
  return {
    wpm: Math.round((chars / 5 / mins) * 10) / 10,
    raw: Math.round((keys / 5 / mins) * 10) / 10,
    acc: keys > 0 ? Math.round(((keys - mistakes) / keys) * 1000) / 10 : 100,
    chars,
    secs: Math.round(ms / 100) / 10,
    words,
  };
}

export function liveWpm(correctChars: number, ms: number): number {
  if (ms < 1500) return 0;
  return Math.round(correctChars / 5 / (ms / 60000));
}

export interface Totals {
  count: number;
  best: number;
  avg10: number;
  today: number;
  words: number;
  secs: number;
  bestAcc: number;
}

export function totals(sessions: Session[], today: (iso: string) => boolean): Totals {
  const last = sessions.slice(-10);
  return {
    count: sessions.length,
    best: sessions.reduce((m, s) => Math.max(m, s.wpm), 0),
    avg10: last.length ? last.reduce((a, s) => a + s.wpm, 0) / last.length : 0,
    today: sessions.filter((s) => today(s.t)).length,
    words: sessions.reduce((a, s) => a + s.words, 0),
    secs: sessions.reduce((a, s) => a + s.secs, 0),
    bestAcc: sessions.reduce((m, s) => Math.max(m, s.acc), 0),
  };
}

export function fmtTime(secs: number): string {
  const s = Math.round(secs);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
