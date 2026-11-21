import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { forgetDevice } from "./lib/push";
import type { Lesson, LiveMeeting, Material, Module, User } from "./data/seed";
import type { Reply, Thread } from "./data/forum";

// Camada de dados: Supabase (login, banco e regras de segurança no servidor).
// As páginas usam o mesmo formato de antes (db.modules, db.threads...): ao entrar,
// os dados do usuário são carregados de uma vez (é pouco volume) e cada ação é
// aplicada na tela na hora e gravada no banco em seguida.

interface Progress {
  completedAt: string;
}

export interface DB {
  modules: Module[];
  users: User[];
  meetings: LiveMeeting[];
  progress: Record<string, Record<string, Progress>>; // userId -> lessonId -> progresso
  notes: Record<string, Record<string, string>>; // userId -> lessonId -> texto
  lastLesson: Record<string, string>; // userId -> lessonId
  threads: Thread[];
  replies: Reply[];
}

const emptyDB = (): DB => ({ modules: [], users: [], meetings: [], progress: {}, notes: {}, lastLesson: {}, threads: [], replies: [] });

export type Status = "loading" | "signed-out" | "ready";

export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

type Result = { ok: boolean; message?: string };

interface Store {
  db: DB;
  user: User | null;
  status: Status;
  error: string | null;
  clearError: () => void;
  recovering: boolean;
  allLessons: Lesson[];
  login: (email: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<Result>;
  setNewPassword: (password: string) => Promise<Result>;
  updatePassword: (current: string, next: string) => Promise<Result>;
  refresh: () => Promise<void>;
  isDone: (lessonId: string, userId?: string) => boolean;
  toggleDone: (lessonId: string, done?: boolean) => void;
  setLastLesson: (lessonId: string) => void;
  setNote: (lessonId: string, text: string) => void;
  updateUser: (patch: Partial<Pick<User, "name" | "city" | "genero">>) => void;
  saveModule: (m: Module) => void;
  deleteModule: (id: string) => void;
  moveModule: (id: string, dir: -1 | 1) => void;
  saveLesson: (moduleId: string, l: Lesson) => void;
  deleteLesson: (moduleId: string, lessonId: string) => void;
  moveLesson: (moduleId: string, lessonId: string, dir: -1 | 1) => void;
  saveMeeting: (m: LiveMeeting) => void;
  deleteMeeting: (id: string) => void;
  addStudent: (s: Pick<User, "name" | "email" | "city">) => Promise<Result>;
  createThread: (t: Pick<Thread, "title" | "body" | "moduleId" | "lessonId">) => string;
  deleteThread: (id: string) => void;
  addReply: (threadId: string, body: string) => void;
  deleteReply: (id: string) => void;
  toggleVote: (kind: "thread" | "reply", id: string) => void;
  markSolution: (threadId: string, replyId: string | null) => void;
}

const Ctx = createContext<Store | null>(null);

const move = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return arr;
  const copy = arr.slice();
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
};

/** Traduz os erros mais comuns do Supabase para o aluno. */
function friendly(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos. Confira os dados e tente de novo.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/rate limit|too many/i.test(msg)) return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  if (/network|fetch/i.test(msg)) return "Sem conexão com o servidor. Verifique sua internet.";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 8 caracteres.";
  if (/pwned|leaked|compromised/i.test(msg)) return "Essa senha apareceu em vazamentos conhecidos. Escolha outra.";
  if (/same.*password|different from the old/i.test(msg)) return "A nova senha precisa ser diferente da atual.";
  return "Não foi possível concluir. Tente de novo em instantes.";
}

/** Carrega tudo o que o usuário logado pode ver (as regras do banco filtram o resto). */
async function fetchAll(): Promise<DB> {
  const [people, profiles, mods, lessons, meetings, progress, notes, threads, replies, tv, rv] = await Promise.all([
    supabase.from("people").select("id, name, role"),
    supabase.from("profiles").select("*"), // o próprio perfil; o mentor recebe todos
    supabase.from("modules").select("*").order("position"),
    supabase.from("lessons").select("*").order("position"),
    supabase.from("meetings").select("*").order("starts_at"),
    supabase.from("progress").select("*"),
    supabase.from("notes").select("*"),
    supabase.from("threads").select("*"),
    supabase.from("replies").select("*").order("created_at"),
    supabase.from("thread_votes").select("*"),
    supabase.from("reply_votes").select("*"),
  ]);
  const failed = [people, profiles, mods, lessons, meetings, progress, notes, threads, replies, tv, rv].find((r) => r.error);
  if (failed?.error) throw failed.error;

  const full = new Map((profiles.data ?? []).map((p) => [p.id as string, p]));
  const db = emptyDB();
  db.users = (people.data ?? []).map((p) => {
    const f = full.get(p.id);
    return {
      id: p.id,
      name: p.name,
      role: p.role,
      email: f?.email ?? "",
      city: f?.city ?? undefined,
      genero: f?.genero ?? undefined,
      joinedAt: f?.joined_at ?? "",
    } as User;
  });
  for (const p of profiles.data ?? []) if (p.last_lesson_id) db.lastLesson[p.id] = p.last_lesson_id;

  db.modules = (mods.data ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    lessons: (lessons.data ?? [])
      .filter((l) => l.module_id === m.id)
      .map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        durationMin: l.duration_min,
        videoUrl: l.video_url,
        materials: (l.materials ?? []) as Material[],
      })),
  }));
  db.meetings = (meetings.data ?? []).map((m) => ({ id: m.id, title: m.title, startsAt: m.starts_at, durationMin: m.duration_min, link: m.link }));
  for (const p of progress.data ?? []) (db.progress[p.user_id] ??= {})[p.lesson_id] = { completedAt: p.completed_at };
  for (const n of notes.data ?? []) (db.notes[n.user_id] ??= {})[n.lesson_id] = n.body;

  const tVotes = new Map<string, string[]>();
  for (const v of tv.data ?? []) tVotes.set(v.thread_id, [...(tVotes.get(v.thread_id) ?? []), v.user_id]);
  const rVotes = new Map<string, string[]>();
  for (const v of rv.data ?? []) rVotes.set(v.reply_id, [...(rVotes.get(v.reply_id) ?? []), v.user_id]);
  db.threads = (threads.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    body: t.body,
    authorId: t.author_id,
    createdAt: t.created_at,
    moduleId: t.module_id,
    lessonId: t.lesson_id ?? undefined,
    solutionId: t.solution_id ?? undefined,
    votes: tVotes.get(t.id) ?? [],
  }));
  db.replies = (replies.data ?? []).map((r) => ({
    id: r.id,
    threadId: r.thread_id,
    authorId: r.author_id,
    body: r.body,
    createdAt: r.created_at,
    votes: rVotes.get(r.id) ?? [],
  }));
  return db;
}

// Cópia local dos dados da última visita: o app abre na hora e funciona sem internet (só leitura).
const cacheKey = (userId: string) => `endoevolution:cache:${userId}`;
const readCache = (userId: string): DB | null => {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as DB) : null;
  } catch {
    return null;
  }
};
const writeCache = (userId: string, db: DB) => {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(db));
  } catch {
    /* armazenamento cheio ou bloqueado: segue sem cópia */
  }
};
const clearCaches = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("endoevolution:cache:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const loadedFor = useRef<string | null>(null);
  // Controle de corrida: uma busca que começou antes de uma alteração não pode sobrescrevê-la.
  const writeSeq = useRef(0); // conta alterações feitas na tela
  const pendingWrites = useRef(0); // gravações ainda em andamento no banco
  const reloadAfterWrites = useRef(false);

  const load = useCallback(async (): Promise<void> => {
    const id = loadedFor.current;
    const seqAtStart = writeSeq.current;
    try {
      const data = await fetchAll();
      if (writeSeq.current !== seqAtStart || pendingWrites.current > 0) {
        // houve alteração enquanto buscava: descarta e busca de novo quando as gravações terminarem
        reloadAfterWrites.current = true;
        if (pendingWrites.current === 0) {
          reloadAfterWrites.current = false;
          return load();
        }
        return;
      }
      setDb(data);
      if (id) writeCache(id, data);
    } catch (e) {
      const cached = id ? readCache(id) : null;
      if (cached) {
        setDb(cached);
        setError(navigator.onLine ? friendly((e as Error).message ?? "") : "Sem internet. Você está vendo os dados da última visita.");
      } else setError(friendly((e as Error).message ?? ""));
    }
    setStatus("ready");
  }, []);

  // sessão: restaura ao abrir e acompanha login/logout
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setStatus("signed-out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(s);
      if (!s) {
        loadedFor.current = null;
        clearCaches();
        setDb(emptyDB());
        setStatus("signed-out");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // carrega os dados quando entra um usuário novo (fora do callback do Auth, como recomenda o Supabase)
  useEffect(() => {
    const id = session?.user.id;
    if (!id || loadedFor.current === id) return;
    loadedFor.current = id;
    const cached = readCache(id);
    if (cached) {
      setDb(cached); // mostra a última visita na hora e atualiza por trás
      setStatus("ready");
    } else setStatus("loading");
    void load();
  }, [session, load]);

  // a cópia local acompanha cada alteração (marcar aula, anotar, perguntar)
  useEffect(() => {
    if (loadedFor.current && status === "ready") writeCache(loadedFor.current, db);
  }, [db, status]);

  // ao voltar para o app, busca novidades (respostas no fórum, aulas novas)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && loadedFor.current) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const me = session?.user.id ?? null;
  const user = (me && db.users.find((u) => u.id === me)) || null;
  const allLessons = useMemo(() => db.modules.flatMap((m) => m.lessons), [db.modules]);

  /** Grava no banco; se falhar, avisa e recarrega o estado real. */
  const save = useCallback(
    (op: PromiseLike<{ error: { message: string } | null }>) => {
      writeSeq.current += 1;
      pendingWrites.current += 1;
      Promise.resolve(op).then(({ error: err }) => {
        pendingWrites.current -= 1;
        if (err) {
          setError(friendly(err.message));
          reloadAfterWrites.current = true;
        }
        if (pendingWrites.current === 0 && reloadAfterWrites.current) {
          reloadAfterWrites.current = false;
          void load();
        }
      });
    },
    [load],
  );

  const editModules = (fn: (mods: Module[]) => Module[]) => setDb((d) => ({ ...d, modules: fn(d.modules) }));
  const editLessons = (moduleId: string, fn: (ls: Lesson[]) => Lesson[]) =>
    editModules((mods) => mods.map((m) => (m.id === moduleId ? { ...m, lessons: fn(m.lessons) } : m)));
  const savePositions = (table: "modules" | "lessons", ids: string[]) =>
    ids.forEach((id, position) => save(supabase.from(table).update({ position }).eq("id", id)));

  const store: Store = {
    db,
    user,
    status,
    error,
    clearError: () => setError(null),
    recovering,
    allLessons,
    refresh: load,

    login: async (email, password) => {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return err ? { ok: false, message: friendly(err.message) } : { ok: true };
    },
    logout: async () => {
      await forgetDevice(); // o próximo a usar este aparelho não recebe as notificações desta conta
      await supabase.auth.signOut();
    },
    requestPasswordReset: async (email) => {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/redefinir-senha` });
      return err ? { ok: false, message: friendly(err.message) } : { ok: true };
    },
    setNewPassword: async (password) => {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (!err) setRecovering(false);
      return err ? { ok: false, message: friendly(err.message) } : { ok: true };
    },
    updatePassword: async (current, next) => {
      const email = session?.user.email;
      if (!email) return { ok: false, message: "Sessão expirada. Entre de novo." };
      const check = await supabase.auth.signInWithPassword({ email, password: current });
      if (check.error) return { ok: false, message: "A senha atual não confere." };
      const { error: err } = await supabase.auth.updateUser({ password: next });
      return err ? { ok: false, message: friendly(err.message) } : { ok: true };
    },

    isDone: (lessonId, userId) => Boolean(db.progress[userId ?? me ?? ""]?.[lessonId]),
    toggleDone: (lessonId, done) => {
      if (!me) return;
      const has = Boolean(db.progress[me]?.[lessonId]);
      const next = done ?? !has;
      if (next === has) return;
      setDb((d) => {
        const mine = { ...(d.progress[me] ?? {}) };
        if (next) mine[lessonId] = { completedAt: new Date().toISOString() };
        else delete mine[lessonId];
        return { ...d, progress: { ...d.progress, [me]: mine } };
      });
      save(
        next
          ? supabase.from("progress").upsert({ user_id: me, lesson_id: lessonId })
          : supabase.from("progress").delete().eq("user_id", me).eq("lesson_id", lessonId),
      );
    },
    setLastLesson: (lessonId) => {
      if (!me || db.lastLesson[me] === lessonId) return;
      setDb((d) => ({ ...d, lastLesson: { ...d.lastLesson, [me]: lessonId } }));
      save(supabase.from("profiles").update({ last_lesson_id: lessonId }).eq("id", me));
    },
    setNote: (lessonId, text) => {
      if (!me) return;
      setDb((d) => ({ ...d, notes: { ...d.notes, [me]: { ...(d.notes[me] ?? {}), [lessonId]: text } } }));
      save(supabase.from("notes").upsert({ user_id: me, lesson_id: lessonId, body: text, updated_at: new Date().toISOString() }));
    },
    updateUser: (patch) => {
      if (!me) return;
      setDb((d) => ({ ...d, users: d.users.map((u) => (u.id === me ? { ...u, ...patch } : u)) }));
      save(supabase.from("profiles").update(patch).eq("id", me));
    },

    saveModule: (m) => {
      const exists = db.modules.some((x) => x.id === m.id);
      editModules((mods) => (exists ? mods.map((x) => (x.id === m.id ? m : x)) : [...mods, m]));
      save(
        exists
          ? supabase.from("modules").update({ title: m.title, description: m.description }).eq("id", m.id)
          : supabase.from("modules").insert({ id: m.id, title: m.title, description: m.description, position: db.modules.length }),
      );
    },
    deleteModule: (id) => {
      editModules((mods) => mods.filter((m) => m.id !== id));
      save(supabase.from("modules").delete().eq("id", id));
    },
    moveModule: (id, dir) => {
      const next = move(db.modules, db.modules.findIndex((m) => m.id === id), dir);
      editModules(() => next);
      savePositions("modules", next.map((m) => m.id));
    },
    saveLesson: (moduleId, l) => {
      const mod = db.modules.find((m) => m.id === moduleId);
      const idx = mod?.lessons.findIndex((x) => x.id === l.id) ?? -1;
      editLessons(moduleId, (ls) => (idx >= 0 ? ls.map((x) => (x.id === l.id ? l : x)) : [...ls, l]));
      save(
        supabase.from("lessons").upsert({
          id: l.id,
          module_id: moduleId,
          title: l.title,
          description: l.description,
          duration_min: l.durationMin,
          video_url: l.videoUrl,
          materials: l.materials,
          position: idx >= 0 ? idx : (mod?.lessons.length ?? 0),
        }),
      );
    },
    deleteLesson: (moduleId, lessonId) => {
      editLessons(moduleId, (ls) => ls.filter((l) => l.id !== lessonId));
      save(supabase.from("lessons").delete().eq("id", lessonId));
    },
    moveLesson: (moduleId, lessonId, dir) => {
      const mod = db.modules.find((m) => m.id === moduleId);
      if (!mod) return;
      const next = move(mod.lessons, mod.lessons.findIndex((l) => l.id === lessonId), dir);
      editLessons(moduleId, () => next);
      savePositions("lessons", next.map((l) => l.id));
    },
    saveMeeting: (m) => {
      setDb((d) => ({
        ...d,
        meetings: (d.meetings.some((x) => x.id === m.id) ? d.meetings.map((x) => (x.id === m.id ? m : x)) : [...d.meetings, m]).sort((a, b) =>
          a.startsAt.localeCompare(b.startsAt),
        ),
      }));
      save(supabase.from("meetings").upsert({ id: m.id, title: m.title, starts_at: m.startsAt, duration_min: m.durationMin, link: m.link }));
    },
    deleteMeeting: (id) => {
      setDb((d) => ({ ...d, meetings: d.meetings.filter((m) => m.id !== id) }));
      save(supabase.from("meetings").delete().eq("id", id));
    },
    addStudent: async (s) => {
      const { data, error: err } = await supabase.functions.invoke("convidar-aluno", {
        body: { ...s, redirectTo: `${location.origin}/redefinir-senha` },
      });
      if (err) {
        let message = "Não foi possível cadastrar o aluno agora.";
        try {
          const body = await (err as { context?: Response }).context?.json();
          if (body?.error) message = body.error;
        } catch {
          /* resposta sem corpo */
        }
        return { ok: false, message };
      }
      void load();
      return { ok: true, message: data?.message };
    },

    createThread: (t) => {
      const id = crypto.randomUUID();
      if (!me) return id;
      const thread: Thread = { ...t, id, authorId: me, createdAt: new Date().toISOString(), votes: [] };
      setDb((d) => ({ ...d, threads: [thread, ...d.threads] }));
      save(supabase.from("threads").insert({ id, title: t.title, body: t.body, module_id: t.moduleId, lesson_id: t.lessonId ?? null }));
      return id;
    },
    deleteThread: (id) => {
      setDb((d) => ({ ...d, threads: d.threads.filter((t) => t.id !== id), replies: d.replies.filter((r) => r.threadId !== id) }));
      save(supabase.from("threads").delete().eq("id", id));
    },
    addReply: (threadId, body) => {
      if (!me) return;
      const reply: Reply = { id: crypto.randomUUID(), threadId, authorId: me, body, createdAt: new Date().toISOString(), votes: [] };
      setDb((d) => ({ ...d, replies: [...d.replies, reply] }));
      save(supabase.from("replies").insert({ id: reply.id, thread_id: threadId, body }));
    },
    deleteReply: (id) => {
      setDb((d) => ({
        ...d,
        replies: d.replies.filter((r) => r.id !== id),
        threads: d.threads.map((t) => (t.solutionId === id ? { ...t, solutionId: undefined } : t)),
      }));
      save(supabase.from("replies").delete().eq("id", id));
    },
    toggleVote: (kind, id) => {
      if (!me) return;
      const list = kind === "thread" ? db.threads.find((t) => t.id === id)?.votes : db.replies.find((r) => r.id === id)?.votes;
      const voted = Boolean(list?.includes(me));
      const flip = (votes: string[]) => (voted ? votes.filter((v) => v !== me) : [...votes, me]);
      setDb((d) =>
        kind === "thread"
          ? { ...d, threads: d.threads.map((t) => (t.id === id ? { ...t, votes: flip(t.votes) } : t)) }
          : { ...d, replies: d.replies.map((r) => (r.id === id ? { ...r, votes: flip(r.votes) } : r)) },
      );
      if (kind === "thread")
        save(
          voted
            ? supabase.from("thread_votes").delete().eq("thread_id", id).eq("user_id", me)
            : supabase.from("thread_votes").insert({ thread_id: id }),
        );
      else
        save(
          voted
            ? supabase.from("reply_votes").delete().eq("reply_id", id).eq("user_id", me)
            : supabase.from("reply_votes").insert({ reply_id: id }),
        );
    },
    markSolution: (threadId, replyId) => {
      setDb((d) => ({ ...d, threads: d.threads.map((t) => (t.id === threadId ? { ...t, solutionId: replyId ?? undefined } : t)) }));
      save(supabase.from("threads").update({ solution_id: replyId }).eq("id", threadId));
    },
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
