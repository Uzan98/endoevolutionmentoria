import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  seedCompleted,
  seedMeetings,
  seedModules,
  seedNotes,
  seedUsers,
  type Lesson,
  type LiveMeeting,
  type Module,
  type User,
} from "./data/seed";

// Camada de dados da demonstração: tudo fica no navegador (localStorage).
// Para produção, troque estas funções por chamadas a um backend (ex.: Supabase/Firebase)
// mantendo a mesma interface do contexto — as páginas não precisam mudar.

const KEY = "endoevolution:v1";

interface Progress {
  completedAt: string;
}

interface DB {
  modules: Module[];
  users: User[];
  meetings: LiveMeeting[];
  progress: Record<string, Record<string, Progress>>; // userId -> lessonId -> progresso
  notes: Record<string, Record<string, string>>; // userId -> lessonId -> texto
  lastLesson: Record<string, string>; // userId -> lessonId
  sessionUserId: string | null;
}

function freshDB(): DB {
  const progress: DB["progress"] = {};
  const base = new Date();
  for (const [uid, ids] of Object.entries(seedCompleted)) {
    progress[uid] = {};
    ids.forEach((id, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - (ids.length - i));
      progress[uid][id] = { completedAt: d.toISOString() };
    });
  }
  return {
    modules: structuredClone(seedModules),
    users: structuredClone(seedUsers),
    meetings: structuredClone(seedMeetings),
    progress,
    notes: structuredClone(seedNotes),
    lastLesson: { "u-camila": "aula-9" },
    sessionUserId: null,
  };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* armazenamento indisponível: segue com dados iniciais */
  }
  return freshDB();
}

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

interface Store {
  db: DB;
  user: User | null;
  allLessons: Lesson[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isDone: (lessonId: string, userId?: string) => boolean;
  toggleDone: (lessonId: string, done?: boolean) => void;
  setLastLesson: (lessonId: string) => void;
  setNote: (lessonId: string, text: string) => void;
  updateUser: (patch: Partial<User>) => void;
  saveModule: (m: Module) => void;
  deleteModule: (id: string) => void;
  moveModule: (id: string, dir: -1 | 1) => void;
  saveLesson: (moduleId: string, l: Lesson) => void;
  deleteLesson: (moduleId: string, lessonId: string) => void;
  moveLesson: (moduleId: string, lessonId: string, dir: -1 | 1) => void;
  saveMeeting: (m: LiveMeeting) => void;
  deleteMeeting: (id: string) => void;
  addStudent: (s: Pick<User, "name" | "email" | "city">) => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

const move = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return arr;
  const copy = arr.slice();
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* ignore */
    }
  }, [db]);

  const user = db.users.find((u) => u.id === db.sessionUserId) ?? null;
  const allLessons = useMemo(() => db.modules.flatMap((m) => m.lessons), [db.modules]);

  const editModules = useCallback((fn: (mods: Module[]) => Module[]) => setDb((d) => ({ ...d, modules: fn(d.modules) })), []);
  const editLessons = useCallback(
    (moduleId: string, fn: (ls: Lesson[]) => Lesson[]) =>
      editModules((mods) => mods.map((m) => (m.id === moduleId ? { ...m, lessons: fn(m.lessons) } : m))),
    [editModules],
  );

  const store: Store = {
    db,
    user,
    allLessons,
    login: (email, password) => {
      const found = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
      if (!found) return false;
      setDb((d) => ({ ...d, sessionUserId: found.id }));
      return true;
    },
    logout: () => setDb((d) => ({ ...d, sessionUserId: null })),
    isDone: (lessonId, userId) => Boolean(db.progress[userId ?? user?.id ?? ""]?.[lessonId]),
    toggleDone: (lessonId, done) => {
      if (!user) return;
      setDb((d) => {
        const mine = { ...(d.progress[user.id] ?? {}) };
        const next = done ?? !mine[lessonId];
        if (next) mine[lessonId] = mine[lessonId] ?? { completedAt: new Date().toISOString() };
        else delete mine[lessonId];
        return { ...d, progress: { ...d.progress, [user.id]: mine } };
      });
    },
    setLastLesson: (lessonId) => {
      if (!user || db.lastLesson[user.id] === lessonId) return;
      setDb((d) => ({ ...d, lastLesson: { ...d.lastLesson, [user.id]: lessonId } }));
    },
    setNote: (lessonId, text) => {
      if (!user) return;
      setDb((d) => ({ ...d, notes: { ...d.notes, [user.id]: { ...(d.notes[user.id] ?? {}), [lessonId]: text } } }));
    },
    updateUser: (patch) => {
      if (!user) return;
      setDb((d) => ({ ...d, users: d.users.map((u) => (u.id === user.id ? { ...u, ...patch } : u)) }));
    },
    saveModule: (m) => editModules((mods) => (mods.some((x) => x.id === m.id) ? mods.map((x) => (x.id === m.id ? m : x)) : [...mods, m])),
    deleteModule: (id) => editModules((mods) => mods.filter((m) => m.id !== id)),
    moveModule: (id, dir) => editModules((mods) => move(mods, mods.findIndex((m) => m.id === id), dir)),
    saveLesson: (moduleId, l) =>
      editLessons(moduleId, (ls) => (ls.some((x) => x.id === l.id) ? ls.map((x) => (x.id === l.id ? l : x)) : [...ls, l])),
    deleteLesson: (moduleId, lessonId) => editLessons(moduleId, (ls) => ls.filter((l) => l.id !== lessonId)),
    moveLesson: (moduleId, lessonId, dir) => editLessons(moduleId, (ls) => move(ls, ls.findIndex((l) => l.id === lessonId), dir)),
    saveMeeting: (m) =>
      setDb((d) => ({
        ...d,
        meetings: (d.meetings.some((x) => x.id === m.id) ? d.meetings.map((x) => (x.id === m.id ? m : x)) : [...d.meetings, m]).sort(
          (a, b) => a.startsAt.localeCompare(b.startsAt),
        ),
      })),
    deleteMeeting: (id) => setDb((d) => ({ ...d, meetings: d.meetings.filter((m) => m.id !== id) })),
    addStudent: (s) =>
      setDb((d) => ({
        ...d,
        users: [...d.users, { ...s, id: uid("u"), password: "demo123", role: "aluno", joinedAt: new Date().toISOString().slice(0, 10) }],
      })),
    resetDemo: () => setDb({ ...freshDB(), sessionUserId: db.sessionUserId }),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fora do StoreProvider");
  return s;
}

/** Progresso de um módulo para um aluno: concluídas, total, minutos. */
export function moduleProgress(m: Module, isDone: (id: string) => boolean) {
  const done = m.lessons.filter((l) => isDone(l.id)).length;
  return { done, total: m.lessons.length, minutes: m.lessons.reduce((s, l) => s + l.durationMin, 0) };
}
