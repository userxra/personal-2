import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  Ellipsis,
  Eye,
  Code,
  History,
  Info,
  Lock,
  LockOpen,
  Paperclip,
  Maximize2,
  Milestone,
  Minimize2,
  PenLine,
  Pin,
  PinOff,
  Trash2,
  Type,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Entry, EntryKind, NoteMeta, NoteType, Perspective } from '../../../../shared/types';
import { Button, IconButton } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Field';
import { Menu } from '../../components/ui/Menu';
import { ErrorNote, Loading } from '../../components/ui/misc';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useAutosize } from '../../hooks/useAutosize';
import { ApiError, errorMessage } from '../../lib/apiFetch';
import { cn } from '../../lib/cn';
import { formatAgo, formatLongDate, today } from '../../lib/dates';
import { isMod, useKeydown } from '../../lib/hotkeys';
import { keys } from '../../lib/keys';
import { ENTRY_LIST } from '../../lib/routes';
import { readJSON, removeKey, writeJSON } from '../../lib/storage';
import { anchorsIn, anchorUrl, type AnchorRef } from '../../lib/anchors';
import { FilePicker } from '../documents/FilePicker';
import { LinksPanel } from '../links/LinksPanel';
import { usePrefs } from '../me/api';
import { useDeleteEntry, useEntry, usePatchEntryMeta, useSetEntryFlags } from './api';
import {
  FormatBar,
  MarkdownEditor,
  undoKey,
  type FormatAction,
  type MarkdownEditorHandle,
  type TextRange,
  type UndoState,
} from './MarkdownEditor';
import { MomentDialog } from '../timeline/MomentDialog';
import { BeliefStand, DecisionPanel, NotePanel } from './NoteDetails';
import { TagInput } from './TagInput';
import { useEntryEditor, type EntryCipher, type SaveStatus } from './useEntryEditor';
import { LegacyBoxError, useEntryLock } from './EntryLockContext';
import { lockExisting, openEntry, sealFields, unlockExisting } from './locking';
import { VersionHistory } from './VersionHistory';
import { EntryMetadata } from './EntryMetadata';

const MarkdownView = lazy(() => import('./MarkdownView'));

const LIST_PATH = ENTRY_LIST;
const SECTION_LABEL: Record<EntryKind, string> = {
  journal: 'Journal',
  writing: 'Writing',
  note: 'Ideas',
};

/** What other pages can pass when opening a new entry. */
export interface NewEntrySeed {
  title?: string;
  body?: string;
  prompt?: string;
  date?: string;
  noteType?: NoteType;
  topic?: string;
  /** Start it locked: its text is encrypted before it is ever sent (journal and writing). */
  locked?: boolean;
}

export function EditorPage({ kind }: { kind: EntryKind }) {
  const { id = 'new' } = useParams();
  const location = useLocation();
  if (id === 'new') return <NewEntry key={location.key} kind={kind} />;
  return <ExistingEntry key={id} kind={kind} id={id} />;
}

function NewEntry({ kind }: { kind: EntryKind }) {
  const location = useLocation();
  const lock = useEntryLock();
  const seed = (location.state as NewEntrySeed | null) ?? undefined;
  const wantsLock = !!seed?.locked && kind !== 'note';
  // Once saved it has an id; if it locks after that, it reopens as that entry.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [admitted, setAdmitted] = useState(false);
  const openNew = lock.isOpen('new') || (!!createdId && lock.isOpen(createdId));
  useEffect(() => {
    if (openNew) setAdmitted(true);
  }, [openNew]);
  // A new encrypted entry needs the PIN before the first word is typed.
  if (wantsLock && (!admitted || !openNew)) {
    if (admitted && createdId) return <Navigate to={`${LIST_PATH[kind]}/${createdId}`} replace />;
    return <LockedGate kind={kind} title={null} scope="new" />;
  }
  return <Editor kind={kind} entry={null} seed={seed} onCreatedId={setCreatedId} />;
}

/** Top bar with the way back, as on the editor. */
function GateTopBar({ kind }: { kind: EntryKind }) {
  return (
    <div className="pt-safe">
      <div className="mx-auto flex h-14 max-w-[52rem] items-center px-2 sm:px-4">
        <Link
          to={LIST_PATH[kind]}
          className="flex h-10 items-center gap-1 rounded pl-1 pr-2 text-sm text-ink-muted hover:bg-surface-2 active:bg-surface-2/60 hover:text-ink sm:h-8"
        >
          <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" /> {SECTION_LABEL[kind]}
        </Link>
      </div>
    </div>
  );
}

/** What a locked entry shows until the PIN is entered: its title (if any), and a way in. */
function LockedGate({
  kind,
  title,
  error,
  upgrade,
  scope,
}: {
  kind: EntryKind;
  title: string | null;
  /** The entry this gate opens (id, or 'new'): the PIN opens that one only. */
  scope: string;
  error?: string;
  /** Sealed with the old key: the passphrase finishes the upgrade. */
  upgrade?: boolean;
}) {
  const lock = useEntryLock();
  const asked = useRef(false);
  useEffect(() => {
    // Ask straight away once; after that, the button. Not after "Lock now": the point was to
    // hide it, and a PIN prompt popping up would only invite someone else to try.
    if (asked.current || lock.status === 'loading' || error || lock.lockedByHand) return;
    asked.current = true;
    void lock.requestUnlock({ scope });
  }, [lock, error, scope]);
  return (
    <div>
      <GateTopBar kind={kind} />
      <div className="mx-auto w-full max-w-[42rem] px-5 pt-16 text-center sm:px-8 sm:pt-24">
        <Lock className="mx-auto h-6 w-6 text-accent" strokeWidth={1.75} aria-hidden />
        <h1
          className="mt-4 font-serif text-[1.375rem] font-medium leading-snug text-ink"
          style={{ fontVariationSettings: "'opsz' 32" }}
        >
          {title === null ? 'New locked entry' : title || 'Locked entry'}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          {error ??
            (title === null
              ? 'Its text is encrypted on this device before it is saved. Enter your PIN to start.'
              : 'Its text is encrypted. Enter your PIN to read and write it.')}
        </p>
        {upgrade ? (
          <Button
            variant="primary"
            className="mt-6"
            onClick={() => void lock.requestUnlock({ scope, upgrade: true })}
          >
            Finish the upgrade
          </Button>
        ) : (
          !error && (
            <Button
              variant="primary"
              className="mt-6"
              onClick={() => void lock.requestUnlock({ scope })}
            >
              <Lock className="h-4 w-4" /> Unlock
            </Button>
          )
        )}
      </div>
    </div>
  );
}

/** A locked entry, decrypted once the key is open (the readable copy lives in memory only). */
function LockedEntry({ kind, entry }: { kind: EntryKind; entry: Entry }) {
  const lock = useEntryLock();
  const [opened, setOpened] = useState<{ from: Entry; entry: Entry } | null>(null);
  const [error, setError] = useState<{ text: string; upgrade: boolean } | null>(null);
  // Only this entry: the PIN opened it, not encrypted entries in general.
  const unlocked = lock.isOpen(entry.id);
  useEffect(() => {
    setError(null);
    if (!unlocked) return setOpened(null);
    let live = true;
    openEntry(lock, entry)
      .then((e) => live && setOpened({ from: entry, entry: e }))
      .catch(
        (err) =>
          live &&
          setError(
            err instanceof LegacyBoxError
              ? { text: err.message, upgrade: true }
              : {
                  text: "This entry can't be opened with this key. It was encrypted with another one.",
                  upgrade: false,
                },
          ),
      );
    return () => {
      live = false;
    };
  }, [entry, unlocked, lock]);
  if (!unlocked || error)
    return (
      <LockedGate
        kind={kind}
        title={entry.title}
        scope={entry.id}
        error={error?.text}
        upgrade={error?.upgrade}
      />
    );
  if (!opened) return <EditorSkeleton kind={kind} />;
  return <Editor key="locked" kind={kind} entry={opened.entry} />;
}

function ExistingEntry({ kind, id }: { kind: EntryKind; id: string }) {
  const query = useEntry(kind, id);
  if (query.data?.locked) return <LockedEntry kind={kind} entry={query.data} />;
  if (query.data) return <Editor key="open" kind={kind} entry={query.data} />;
  return <EditorSkeleton kind={kind} query={query} />;
}

function EditorSkeleton({ kind, query }: { kind: EntryKind; query?: ReturnType<typeof useEntry> }) {
  // Laid out like the editor (top bar, then the writing column), so it opens without a jump.
  return (
    <div>
      <GateTopBar kind={kind} />
      <div className="mx-auto w-full max-w-[42rem] px-5 pt-4 sm:px-8 sm:pt-10">
        {query?.isError ? (
          query.error instanceof ApiError && query.error.status === 404 ? (
            <p className="py-8 text-ink-muted">This entry doesn&apos;t exist any more.</p>
          ) : (
            <ErrorNote onRetry={() => void query.refetch()}>{errorMessage(query.error)}</ErrorNote>
          )
        ) : (
          <Skeleton>
            {kind === 'journal' && (
              <SkeletonText className="mb-3 text-[0.8125rem] font-medium" width="10rem" />
            )}
            <SkeletonText
              className="font-serif text-[1.625rem] font-medium leading-tight sm:text-[1.875rem]"
              width="58%"
            />
            <div className="mt-6 space-y-1">
              {['100%', '96%', '100%', '88%', '93%', '64%'].map((w, i) => (
                <SkeletonText key={i} className="text-[1.0625rem] leading-8" width={w} />
              ))}
            </div>
          </Skeleton>
        )}
      </div>
    </div>
  );
}

const loadRichEditor = () => import('./RichEditor');
const RichEditor = lazy(loadRichEditor);
/** Fetches the formatted editor's code ahead of time (it is only needed when writing). */
export const preloadRichEditor = () => void loadRichEditor().catch(() => {});

/** Ask for the web address to link the selected words to. */
function WebLinkDialog({
  open,
  words,
  onClose,
  onSubmit,
}: {
  open: boolean;
  words: string;
  onClose: () => void;
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (open) setUrl('');
  }, [open]);
  const normalized = (() => {
    const u = url.trim();
    if (!u) return '';
    return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`;
  })();
  return (
    <Dialog open={open} onClose={onClose} title="Link to a web address" placement="top">
      <form
        className="space-y-3 p-4"
        // "example.com" is fine (https:// is added); the browser's own URL check would refuse it.
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (normalized) onSubmit(normalized);
        }}
      >
        {words && (
          <p className="truncate text-[0.8125rem] text-ink-muted">
            Linking <span className="text-ink">“{words}”</span>
          </p>
        )}
        <Input
          type="url"
          inputMode="url"
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com/page"
          aria-label="Web address"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!normalized}>
            Link
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function statusLabel(status: SaveStatus, savedAt: number | null): { text: string; tone: string } {
  switch (status) {
    case 'new':
      return { text: 'Not saved yet', tone: 'text-ink-faint' };
    case 'saved':
      return {
        text: savedAt ? `Saved ${formatAgo(new Date(savedAt).toISOString())}` : 'Saved',
        tone: 'text-ink-faint',
      };
    case 'unsaved':
      return { text: 'Editing', tone: 'text-ink-faint' };
    case 'saving':
      return { text: 'Saving…', tone: 'text-ink-faint' };
    case 'offline':
      return { text: 'Offline · kept on this device', tone: 'text-warn' };
    case 'error':
      return { text: 'Not saved', tone: 'text-bad' };
    case 'conflict':
      return { text: 'Changed elsewhere', tone: 'text-bad' };
  }
}

function countWords(s: string) {
  return s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
}

function Editor({
  kind,
  entry,
  seed,
  onCreatedId,
}: {
  kind: EntryKind;
  entry: Entry | null;
  seed?: NewEntrySeed;
  onCreatedId?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const prefs = usePrefs();
  const font = prefs.data?.writingFont ?? 'serif';

  const newFields = useMemo(
    () => ({
      title: seed?.title ?? '',
      body: seed?.prompt ? `> ${seed.prompt}\n\n` : (seed?.body ?? ''),
      date: kind === 'journal' ? (seed?.date ?? today()) : null,
      tags: [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // A new note's kind/topic/sources are kept here until its first save creates it.
  const [pendingNote, setPendingNote] = useState<
    Pick<NoteMeta, 'noteType' | 'topic' | 'sources' | 'perspectives'>
  >({
    noteType: seed?.noteType ?? 'note',
    topic: seed?.topic ?? null,
    sources: [],
    perspectives: [],
  });
  const pendingNoteRef = useRef(pendingNote);
  pendingNoteRef.current = pendingNote;

  // Locked: the text is encrypted here before every save (an entry can be locked before it is
  // first saved, so the server never sees it, or later, which replaces every readable copy).
  const lock = useEntryLock();
  const lockRef = useRef(lock);
  lockRef.current = lock;
  /** This entry's id ('new' until saved): what the PIN opens for it. */
  const scopeRef = useRef(entry?.id ?? 'new');
  const lockable = kind !== 'note';
  const [locked, setLocked] = useState(() => entry?.locked ?? (lockable && !!seed?.locked));
  const cipher = useMemo<EntryCipher | null>(
    () => (locked ? { seal: (f) => sealFields(lock, f), open: (e) => openEntry(lock, e) } : null),
    [locked, lock],
  );
  const [lockBusy, setLockBusy] = useState(false);

  const ed = useEntryEditor(kind, entry, {
    cipher,
    newFields,
    createExtra: () => (kind === 'note' ? pendingNoteRef.current : {}),
    // Swap /journal/new for the real URL without remounting (keeps focus and caret).
    onCreated: (created) => {
      window.history.replaceState(window.history.state, '', `${LIST_PATH[kind]}/${created.id}`);
      // The PIN opened "this new entry"; it stays open under its id.
      lockRef.current.rescope('new', created.id);
      scopeRef.current = created.id;
      onCreatedId?.(created.id);
    },
  });

  // Keep pinned/archived current (they can change from the list or another device).
  const live = useEntry(kind, ed.id).data ?? entry;
  useEffect(() => {
    if (entry) ed.applyRemote(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  // Locking (after inactivity, say) saves this text first, encrypted.
  const { registerFlush } = lock;
  const flushRef = useRef(ed.flush);
  flushRef.current = ed.flush;
  useEffect(
    () => (locked ? registerFlush(() => flushRef.current()) : undefined),
    [locked, registerFlush],
  );

  /** Lock with the PIN. Not yet saved: nothing to replace. Saved: every readable copy goes. */
  const lockEntry = async () => {
    if (!(await lock.requestUnlock({ scope: scopeRef.current }))) return;
    const before = await ed.settle();
    if (!before.id) {
      // Never saved: from now on it is only ever sent encrypted.
      removeKey(`draft:${kind}:new`);
      setLocked(true);
      setTimeout(() => void flushRef.current(), 0);
      toast({ message: 'Encrypted. It will only ever be saved encrypted.' });
      return;
    }
    const ok = await confirm({
      title: 'Encrypt this entry?',
      message:
        'Its text, tags and every earlier version are encrypted on this device, and the readable copies are deleted from the server. The title stays readable. Opening it will need your PIN.',
      confirmLabel: 'Encrypt',
    });
    if (!ok) return void flushRef.current();
    setLockBusy(true);
    try {
      const { id, rev } = await ed.settle();
      const done = await lockExisting(lock, kind, id!, rev, ed.fields);
      afterLockChange(done, 'Encrypted');
    } catch (err) {
      toast({ message: `Not encrypted: ${errorMessage(err)}`, tone: 'error' });
      void flushRef.current();
    } finally {
      setLockBusy(false);
    }
  };

  /** Remove the lock: the text and its history become readable on the server again. */
  const unlockEntry = async () => {
    // Always the PIN again, even while open: someone holding an open phone can't remove it.
    if (!(await lock.requestUnlock({ scope: scopeRef.current, confirm: true }))) return;
    const before = await ed.settle();
    if (!before.id) {
      setLocked(false);
      setTimeout(() => void flushRef.current(), 0);
      return;
    }
    const ok = await confirm({
      title: 'Remove encryption?',
      message:
        'The text, tags and earlier versions are stored readable on the server again, and show up in search and lists. The PIN is no longer needed to open it.',
      confirmLabel: 'Remove encryption',
    });
    if (!ok) return void flushRef.current();
    setLockBusy(true);
    try {
      const { id, rev } = await ed.settle();
      const done = await unlockExisting(lock, kind, id!, rev, ed.fields);
      afterLockChange(done, 'Encryption removed');
    } catch (err) {
      toast({ message: `Encryption not removed: ${errorMessage(err)}`, tone: 'error' });
      void flushRef.current();
    } finally {
      setLockBusy(false);
    }
  };

  /** The server has the entry in its new form: reopen it that way (a fresh editor). */
  const afterLockChange = (done: Entry, message: string) => {
    ed.forget(); // what's on screen is saved; nothing to write locally or send again
    // The PIN was just entered for this entry: it reopens (encrypted) without asking again.
    lock.rescope(scopeRef.current, done.id);
    qc.setQueryData(keys.entry(kind, done.id), done);
    void qc.invalidateQueries({ queryKey: ['entries', kind] });
    void qc.invalidateQueries({ queryKey: ['versions', kind, done.id] });
    qc.removeQueries({ queryKey: ['version'] });
    toast({ message });
    navigate(`${LIST_PATH[kind]}/${done.id}`, { replace: true });
  };

  const [mode, setMode] = useState<'write' | 'read'>('write');
  const [focusMode, setFocusMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  // Linking words to a file: the selection is remembered while the picker is open.
  const [filePick, setFilePick] = useState<{ range: TextRange; words: string } | null>(null);
  const [momentOpen, setMomentOpen] = useState(false);
  const [showFormat, setShowFormat] = useState(
    () => readJSON<boolean>('editor:formatbar') ?? false,
  );
  const editorRef = useRef<MarkdownEditorHandle>(null);
  // Formatted writing (as it reads) unless the owner prefers Markdown, or this text has
  // something the formatted editor can't show.
  const [plainPref, setPlainPref] = useState(() => readJSON<boolean>('editor:plain') === true);
  const [unsupported, setUnsupported] = useState(false);
  const rich = !plainPref && !unsupported;
  const [active, setActive] = useState<Set<FormatAction>>(() => new Set());
  const [undoState, setUndoState] = useState<UndoState>({ undo: false, redo: false });
  // Each editor keeps its own history: switching between them starts with nothing to undo.
  useEffect(() => setUndoState({ undo: false, redo: false }), [rich]);
  const [webLink, setWebLink] = useState<{ range: TextRange; words: string } | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useAutosize(titleRef, ed.fields.title);

  const flags = useSetEntryFlags(kind);
  const patchMeta = usePatchEntryMeta(kind);
  const noteMeta: NoteMeta = live?.note ?? { ...pendingNote, decision: null };
  const isBelief = kind === 'note' && noteMeta.noteType === 'belief';
  // A belief can start with where you stand, before it has a title or notes: that creates it.
  const changeStand = (perspectives: Perspective[]) => {
    if (ed.id) return changeNote({ perspectives });
    pendingNoteRef.current = { ...pendingNoteRef.current, perspectives };
    setPendingNote(pendingNoteRef.current);
    void ed.ensureCreated().then((id) => {
      // Created by an earlier save (from the title, say) that didn't have these yet.
      const saved = id ? qc.getQueryData<Entry>(keys.entry(kind, id))?.note?.perspectives : null;
      if (id && JSON.stringify(saved) !== JSON.stringify(perspectives))
        saveNote(id, { perspectives });
    });
  };
  const saveNote = (id: string, patch: Partial<NoteMeta>) =>
    patchMeta.mutate(
      { id, patch },
      { onError: (err) => toast({ message: `Not saved: ${errorMessage(err)}`, tone: 'error' }) },
    );
  const changeNote = (patch: Partial<NoteMeta>) => {
    if (!ed.id) return setPendingNote((p) => ({ ...p, ...patch }));
    saveNote(ed.id, patch);
  };
  const del = useDeleteEntry(kind);
  const bodyLabel = kind === 'journal' ? 'Journal entry' : kind === 'note' ? 'Note' : 'Text';
  const bodyRows = kind === 'note' ? 3 : 8;
  const bodyPlaceholder = isBelief
    ? 'Anything else: background, arguments, what you have read… (optional)'
    : kind === 'journal'
      ? 'Write about your day, or anything at all…'
      : kind === 'note'
        ? 'Write it out: an explanation, an argument, a question, a passage…'
        : 'Start writing…';

  const currentSelection = () => {
    const h = editorRef.current;
    const range = h?.selection() ?? { start: 0, end: 0 };
    return { range, words: h?.textOf(range).trim() ?? '' };
  };
  const pickFileForWords = () => setFilePick(currentSelection());
  const linkWords = (ref: AnchorRef, name: string) => {
    const pick = filePick;
    setFilePick(null);
    if (!pick) return;
    // Saving the text also links the whole entry to the file (the server keeps those links in
    // step with the linked words, and removes them again when the words go).
    editorRef.current?.linkRange(pick.range, anchorUrl(ref), name);
    toast({ message: `Linked ${pick.words ? `“${pick.words}”` : 'it'} to ${name}` });
  };
  // Pressing a link button on words that already have that kind of link removes it.
  const onFormat = (a: FormatAction) => {
    const h = editorRef.current;
    if (!h) return;
    if (a !== 'file' && a !== 'link') return h.format(a);
    if (h.active().has(a)) return h.unlink();
    if (a === 'file') return pickFileForWords();
    if (!rich) return h.format('link'); // plain Markdown: [words](https://) to fill in
    setWebLink(currentSelection());
  };
  const linkToWeb = (url: string) => {
    const pick = webLink;
    setWebLink(null);
    if (pick) editorRef.current?.linkRange(pick.range, url, url.replace(/^https?:\/\//, ''));
  };
  const togglePlain = () => {
    const next = !plainPref;
    setPlainPref(next);
    writeJSON('editor:plain', next);
  };

  // Start typing straight away in a new entry.
  useEffect(() => {
    // A new belief starts with naming it; where you stand comes right under the title.
    if (!entry)
      setTimeout(() => (isBelief ? titleRef.current?.focus() : editorRef.current?.focus()), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  useKeydown((e) => {
    if (isMod(e) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      void ed.flush();
    } else if (isMod(e) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setFocusMode((f) => !f);
    } else if (e.key === 'Escape' && focusMode && !e.defaultPrevented) {
      setFocusMode(false);
    } else if (undoKey(e) && mode === 'write' && e.target === document.body) {
      // Nothing focused (after a click on the page, say): undo still means the text.
      e.preventDefault();
      if (undoKey(e) === 'undo') editorRef.current?.undo();
      else editorRef.current?.redo();
    }
  });

  const goBack = () => {
    // Back if we came from inside the app, otherwise to the list.
    if (location.key !== 'default' && window.history.length > 1) navigate(-1);
    else navigate(LIST_PATH[kind]);
  };

  const remove = async () => {
    if (!ed.id) {
      ed.forget();
      ed.discardLocalDraft();
      navigate(LIST_PATH[kind], { replace: true });
      return;
    }
    const ok = await confirm({
      title:
        kind === 'journal'
          ? 'Delete this journal entry?'
          : kind === 'note'
            ? 'Delete this note?'
            : 'Delete this piece of writing?',
      message: 'It will be gone for good. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    ed.forget();
    // Promise, not callbacks: removing the entry's query unmounts this editor.
    await del
      .mutateAsync(ed.id)
      .then(() => {
        toast({ message: 'Deleted' });
        navigate(LIST_PATH[kind], { replace: true });
      })
      .catch((err) => toast({ message: errorMessage(err), tone: 'error' }));
  };

  const setFlag = (patch: { pinned?: boolean; archived?: boolean }) => {
    if (!ed.id) return;
    flags.mutate(
      { id: ed.id, flags: patch },
      {
        onSuccess: () =>
          toast({
            message:
              patch.archived === true
                ? 'Archived'
                : patch.archived === false
                  ? 'Moved back to Writing'
                  : patch.pinned
                    ? 'Pinned'
                    : 'Unpinned',
          }),
        onError: (err) => toast({ message: errorMessage(err), tone: 'error' }),
      },
    );
  };

  const toggleFormat = () => {
    setShowFormat((s) => {
      writeJSON('editor:formatbar', !s);
      return !s;
    });
  };

  const words = countWords(ed.fields.body);
  const status = statusLabel(ed.status, ed.savedAt);
  const label = SECTION_LABEL[kind];

  // Encrypted, and the PIN hasn't opened this entry (locked by hand, after a while, or a new
  // entry encrypted in place): nothing of it shows until the PIN is entered for it again.
  if (locked && !lock.isOpen(scopeRef.current) && !lockBusy)
    return <LockedGate kind={kind} title={ed.fields.title} scope={scopeRef.current} />;

  return (
    <div className={cn('min-h-dvh bg-bg', focusMode && 'fixed inset-0 z-40 overflow-y-auto')}>
      {/* Top bar */}
      <div className="pt-safe sticky top-0 z-20 bg-bg/95 backdrop-blur-[2px]">
        <div className="mx-auto flex h-14 max-w-[52rem] items-center gap-1 px-2 sm:px-4">
          {!focusMode && (
            <button
              type="button"
              onClick={goBack}
              className="flex h-10 items-center gap-1 rounded pl-1 pr-2 text-sm text-ink-muted hover:bg-surface-2 active:bg-surface-2/60 hover:text-ink sm:h-8"
            >
              <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )}
          <p
            className={cn('ml-2 min-w-0 flex-1 truncate text-[0.8125rem]', status.tone)}
            aria-live="polite"
            title={ed.savedAt ? new Date(ed.savedAt).toLocaleString() : undefined}
          >
            {lockBusy ? (locked ? 'Removing encryption…' : 'Encrypting…') : status.text}
            <span className="hidden text-ink-faint sm:inline">
              {words > 0 && ` · ${words.toLocaleString()} ${words === 1 ? 'word' : 'words'}`}
            </span>
          </p>
          {/* Encrypted: lock it now (hides it at once; the PIN opens it again). Not yet: encrypt. */}
          {lockable && (locked || !focusMode) && (
            <IconButton
              label={locked ? 'Lock now' : 'Encrypt with PIN'}
              disabled={lockBusy}
              onClick={() => (locked ? lock.lock() : void lockEntry())}
              className={cn(locked && 'text-accent')}
            >
              <Lock className="h-4 w-4" />
            </IconButton>
          )}
          {mode === 'write' && !focusMode && (
            <IconButton
              label={showFormat ? 'Hide formatting' : 'Formatting'}
              active={showFormat}
              onClick={toggleFormat}
            >
              <Type className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton
            label={mode === 'write' ? 'Read view' : 'Edit'}
            onClick={() => setMode((m) => (m === 'write' ? 'read' : 'write'))}
          >
            {mode === 'write' ? <Eye className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
          </IconButton>
          <IconButton
            label={focusMode ? 'Leave focus mode' : 'Focus mode'}
            onClick={() => setFocusMode((f) => !f)}
          >
            {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </IconButton>
          {!focusMode && (
            <Menu
              trigger={(p) => (
                <IconButton label="More actions" {...p}>
                  <Ellipsis className="h-4 w-4" />
                </IconButton>
              )}
              items={[
                ...(mode === 'write'
                  ? [
                      {
                        label: 'Link words to a file…',
                        icon: <Paperclip />,
                        onSelect: pickFileForWords,
                      },
                      ...(unsupported
                        ? []
                        : [
                            {
                              label: plainPref
                                ? 'Show formatting while writing'
                                : 'Write in plain Markdown',
                              icon: <Code />,
                              onSelect: togglePlain,
                            },
                          ]),
                    ]
                  : []),
                ...(kind !== 'journal' && live
                  ? [
                      {
                        label: live.pinned ? 'Unpin' : 'Pin to top',
                        icon: live.pinned ? <PinOff /> : <Pin />,
                        onSelect: () => setFlag({ pinned: !live.pinned }),
                      },
                    ]
                  : []),
                ...(kind === 'writing' && live
                  ? [
                      {
                        label: live.archived ? 'Unarchive' : 'Archive',
                        icon: live.archived ? <ArchiveRestore /> : <Archive />,
                        onSelect: () => setFlag({ archived: !live.archived }),
                      },
                    ]
                  : []),
                ...(locked
                  ? [
                      {
                        label: 'Remove encryption…',
                        icon: <LockOpen />,
                        onSelect: () => void unlockEntry(),
                      },
                    ]
                  : []),
                ...(ed.id
                  ? [
                      {
                        label: 'Metadata',
                        icon: <Info />,
                        // Save first, so "last modified" and the counts agree.
                        onSelect: () => void ed.flush().then(() => setMetaOpen(true)),
                      },
                      {
                        label: 'Version history',
                        icon: <History />,
                        // Save first, so the history compares against what's on screen.
                        onSelect: () => void ed.flush().then(() => setHistoryOpen(true)),
                      },
                      {
                        label: 'Add to timeline…',
                        icon: <Milestone />,
                        onSelect: () => setMomentOpen(true),
                      },
                    ]
                  : []),
                {
                  label: ed.id ? 'Delete…' : 'Discard',
                  icon: <Trash2 />,
                  danger: true,
                  onSelect: () => void remove(),
                },
              ]}
            />
          )}
        </div>
        {showFormat && mode === 'write' && !focusMode && (
          <div className="mx-auto max-w-[52rem] border-t border-line px-2 py-1 sm:px-4">
            <FormatBar
              onFormat={onFormat}
              active={rich ? active : undefined}
              rich={rich}
              history={undoState}
              onHistory={(a) =>
                a === 'undo' ? editorRef.current?.undo() : editorRef.current?.redo()
              }
            />
          </div>
        )}
      </div>

      <article className="mx-auto w-full max-w-[42rem] px-5 pb-[45vh] pt-4 sm:px-8 sm:pt-10">
        <Notices ed={ed} />

        {kind === 'journal' && ed.fields.date && (
          <DateField value={ed.fields.date} onChange={(date) => ed.setFields({ date })} />
        )}
        {live?.archived && (
          <p className="mb-2 text-2xs uppercase tracking-[0.12em] text-ink-faint">Archived</p>
        )}

        {mode === 'write' ? (
          <>
            <textarea
              ref={titleRef}
              value={ed.fields.title}
              onChange={(e) => ed.setFields({ title: e.target.value.replace(/\n/g, ' ') })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  editorRef.current?.focus();
                }
              }}
              rows={1}
              maxLength={300}
              placeholder={
                kind === 'journal'
                  ? 'Title (optional)'
                  : isBelief
                    ? 'The belief, in a few words'
                    : 'Untitled'
              }
              aria-label="Title"
              className="block w-full resize-none overflow-hidden bg-transparent font-serif text-[1.625rem] font-medium leading-tight tracking-[-0.01em] text-ink placeholder:text-ink-faint/70 focus:outline-none focus-visible:outline-none sm:text-[1.875rem]"
              style={{ fontVariationSettings: "'opsz' 48" }}
            />
            {!focusMode && (
              <div className="mt-3">
                <TagInput
                  kind={kind}
                  tags={ed.fields.tags}
                  onChange={(tags) => ed.setFields({ tags })}
                />
              </div>
            )}
            {/* A belief leads with where you stand; its kind, topic and sources come after. */}
            {isBelief && (
              <BeliefStand
                perspectives={noteMeta.perspectives}
                onChange={changeStand}
                font={font}
              />
            )}
            {kind === 'note' && !focusMode && (
              <div className={isBelief ? 'mt-8' : undefined}>
                <NotePanel key={ed.id ?? 'new'} meta={noteMeta} onChange={changeNote} />
              </div>
            )}
            {isBelief && <h2 className="section-label mt-12">Notes</h2>}
            <div className={isBelief ? 'mt-3' : 'mt-6'}>
              {unsupported && !plainPref && (
                <p className="mb-3 text-2xs text-ink-faint">
                  This text uses Markdown the formatted view can&apos;t show without losing
                  something, so it&apos;s edited as Markdown.
                </p>
              )}
              {rich ? (
                <Suspense fallback={<div style={{ minHeight: `${bodyRows * 1.75}em` }} />}>
                  <RichEditor
                    ref={editorRef}
                    value={ed.fields.body}
                    onChange={(body) => ed.setFields({ body })}
                    font={font}
                    ariaLabel={bodyLabel}
                    minRows={bodyRows}
                    placeholder={bodyPlaceholder}
                    autoFocus={!entry && !isBelief}
                    onActive={setActive}
                    onHistory={setUndoState}
                    historyKey={ed.historyKey}
                    onUnsupported={() => setUnsupported(true)}
                  />
                </Suspense>
              ) : (
                <MarkdownEditor
                  ref={editorRef}
                  value={ed.fields.body}
                  onChange={(body) => ed.setFields({ body })}
                  font={font}
                  ariaLabel={bodyLabel}
                  minRows={bodyRows}
                  placeholder={bodyPlaceholder}
                  onHistory={setUndoState}
                  historyKey={ed.historyKey}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <h1
              className={cn(
                'font-serif text-[1.625rem] font-medium leading-tight sm:text-[1.875rem]',
                !ed.fields.title && 'text-ink-faint',
              )}
              style={{ fontVariationSettings: "'opsz' 48" }}
            >
              {ed.fields.title ||
                (kind === 'journal' ? formatLongDate(ed.fields.date ?? today()) : 'Untitled')}
            </h1>
            {ed.fields.tags.length > 0 && (
              <p className="mt-2 text-[0.8125rem] text-ink-faint">
                {ed.fields.tags.map((t) => `#${t}`).join('  ')}
              </p>
            )}
            {isBelief && (
              <BeliefStand
                readOnly
                font={font}
                perspectives={noteMeta.perspectives}
                onChange={changeStand}
              />
            )}
            {isBelief && ed.fields.body.trim() && <h2 className="section-label mt-12">Notes</h2>}
            <Suspense fallback={<Loading />}>
              <MarkdownView
                source={isBelief ? ed.fields.body : ed.fields.body || '_Nothing written yet._'}
                font={font}
                className="mt-6"
              />
            </Suspense>
          </>
        )}

        {kind === 'note' && noteMeta.noteType === 'decision' && !focusMode && (
          <DecisionPanel
            decision={noteMeta.decision}
            onChange={(decision) =>
              ed.id
                ? changeNote({ decision })
                : toast({ message: 'Write a line first, so the note exists.', tone: 'error' })
            }
          />
        )}
        {!focusMode && ed.id && (
          <LinksPanel
            item={{ type: kind, id: ed.id }}
            passages={anchorsIn(ed.fields.body)}
            className="mt-14"
          />
        )}
        <WebLinkDialog
          open={!!webLink}
          words={webLink?.words ?? ''}
          onClose={() => setWebLink(null)}
          onSubmit={linkToWeb}
        />
        <FilePicker
          open={!!filePick}
          onClose={() => setFilePick(null)}
          onPick={linkWords}
          words={filePick?.words ?? ''}
        />
      </article>

      {ed.id && (
        <>
          <VersionHistory
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            kind={kind}
            entryId={ed.id}
            current={{ title: ed.fields.title, body: ed.fields.body, tags: ed.fields.tags }}
            onRestore={(v) => ed.setFields(v)}
            locked={locked}
          />
          {live && (
            <EntryMetadata
              open={metaOpen}
              onClose={() => setMetaOpen(false)}
              kind={kind}
              entry={live}
              title={ed.fields.title}
              body={ed.fields.body}
              tags={ed.fields.tags}
            />
          )}
          <MomentDialog
            open={momentOpen}
            onClose={() => setMomentOpen(false)}
            initial={{
              date: ed.fields.date ?? today(),
              title: ed.fields.title,
              ref: { type: kind, id: ed.id },
            }}
          />
        </>
      )}
    </div>
  );
}

/** The journal date reads as text; tapping it opens the native date picker. */
function DateField({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  return (
    <label className="relative mb-3 inline-flex cursor-pointer items-center overflow-hidden text-[0.8125rem] font-medium uppercase tracking-[0.1em] text-ink-faint hover:text-ink-muted">
      {formatLongDate(value)}
      <input
        type="date"
        value={value}
        max="9999-12-31"
        onChange={(e) => e.target.value && onChange(e.target.value)}
        aria-label="Entry date"
        className="absolute inset-0 h-full w-full min-w-0 cursor-pointer opacity-0"
      />
    </label>
  );
}

function Banner({
  tone = 'muted',
  children,
  actions,
}: {
  tone?: 'muted' | 'bad' | 'warn';
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={cn(
        'mb-6 border-l-2 bg-surface py-3 pl-4 pr-3 text-sm',
        tone === 'bad' ? 'border-bad' : tone === 'warn' ? 'border-warn' : 'border-accent/60',
      )}
    >
      <p className="text-ink-muted">{children}</p>
      {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function Notices({ ed }: { ed: ReturnType<typeof useEntryEditor> }) {
  if (ed.conflict) {
    return (
      <Banner
        tone="bad"
        actions={
          <>
            <Button size="sm" variant="primary" onClick={() => ed.resolveConflict('mine')}>
              Keep my version
            </Button>
            <Button size="sm" onClick={() => ed.resolveConflict('theirs')}>
              Use the other version
            </Button>
          </>
        }
      >
        This was changed on another device ({formatAgo(ed.conflict.updatedAt)},{' '}
        {countWords(ed.conflict.body).toLocaleString()} words) while you were editing here. Your
        text is safe on this device. Which version should be kept?
      </Banner>
    );
  }
  if (ed.status === 'error') {
    const deleted = ed.errorText?.startsWith('This entry was deleted');
    return (
      <Banner
        tone="bad"
        actions={
          deleted ? (
            <Button size="sm" variant="primary" onClick={ed.saveAsNew}>
              Save as a new entry
            </Button>
          ) : (
            <Button size="sm" onClick={ed.retry}>
              Try again
            </Button>
          )
        }
      >
        {ed.errorText ?? 'Your latest changes could not be saved.'}{' '}
        {!deleted && 'They are kept on this device.'}
      </Banner>
    );
  }
  if (ed.status === 'offline') {
    return (
      <Banner tone="warn">
        You&apos;re offline. Everything you write is kept on this device and will be saved when the
        connection returns.
      </Banner>
    );
  }
  if (ed.notice?.type === 'restored') {
    return (
      <Banner
        actions={
          <>
            <Button size="sm" onClick={ed.dismissNotice}>
              OK
            </Button>
            <Button size="sm" variant="ghost" onClick={ed.discardLocalDraft}>
              Discard them
            </Button>
          </>
        }
      >
        Restored unsaved changes from this device.
      </Banner>
    );
  }
  if (ed.notice?.type === 'older-draft') {
    return (
      <Banner
        tone="warn"
        actions={
          <>
            <Button size="sm" onClick={ed.restoreOlderDraft}>
              Restore them
            </Button>
            <Button size="sm" variant="ghost" onClick={ed.discardLocalDraft}>
              Discard
            </Button>
          </>
        }
      >
        This device has unsaved changes from {formatAgo(new Date(ed.notice.draft.at).toISOString())}
        , made before a newer version was saved elsewhere. Restoring them replaces the newer
        version.
      </Banner>
    );
  }
  return null;
}
