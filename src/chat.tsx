import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { useStore } from "./store";

// Chat aluno <-> equipe, em tempo real (Supabase Realtime).
// * Mensagens e leituras chegam por Postgres Changes (o servidor aplica as mesmas regras do banco:
//   cada aluno só recebe a própria conversa; o mentor recebe todas).
// * "digitando…" e "online" usam canais privados: chat:<id do aluno> e equipe-online.

export interface ChatMessage {
  id: string;
  studentId: string; // dono da conversa
  senderId: string;
  body: string;
  createdAt: string;
  state?: "sending" | "failed";
}

interface Chat {
  ready: boolean;
  messages: ChatMessage[]; // em ordem de envio
  conversation: (studentId: string) => ChatMessage[];
  send: (studentId: string, body: string) => void;
  retry: (id: string) => void;
  markRead: (studentId: string) => void;
  unread: (studentId: string) => number;
  totalUnread: number;
  /** Até quando "o outro lado" leu a conversa (para o "Visto"). */
  seenUntil: (studentId: string) => string | null;
  /** Conversa aberta na tela: liga o "digitando…" e a presença dela. */
  setActive: (studentId: string | null) => void;
  typing: boolean; // o outro lado está digitando na conversa aberta
  notifyTyping: () => void;
  peerOnline: boolean; // aluno: alguém da equipe online · mentor: o aluno da conversa aberta online
}

const Ctx = createContext<Chat | null>(null);

type Row = { id: string; student_id: string; sender_id: string; body: string; created_at: string };
type ReadRow = { user_id: string; student_id: string; last_read_at: string };

const toMsg = (r: Row): ChatMessage => ({ id: r.id, studentId: r.student_id, senderId: r.sender_id, body: r.body, createdAt: r.created_at });
const byTime = (a: ChatMessage, b: ChatMessage) => a.createdAt.localeCompare(b.createdAt);
const readKey = (userId: string, studentId: string) => `${userId}:${studentId}`;

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, db } = useStore();
  const me = user?.id ?? null;
  const isMentor = user?.role === "mentor";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reads, setReads] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [typingUntil, setTypingUntil] = useState(0);
  const [teamOnline, setTeamOnline] = useState(false);
  const [studentOnline, setStudentOnline] = useState(false);
  const convChannel = useRef<RealtimeChannel | null>(null);
  const lastTypingSent = useRef(0);
  const [, tick] = useState(0);

  const mentorIds = useMemo(() => new Set(db.users.filter((u) => u.role === "mentor").map((u) => u.id)), [db.users]);

  const upsertMessage = useCallback((m: ChatMessage) => {
    setMessages((list) => {
      const i = list.findIndex((x) => x.id === m.id);
      if (i < 0) return [...list, m].sort(byTime);
      const copy = list.slice();
      copy[i] = m;
      return copy.sort(byTime);
    });
  }, []);
  const upsertRead = useCallback((r: ReadRow) => {
    setReads((all) => {
      const k = readKey(r.user_id, r.student_id);
      return all[k] && all[k] >= r.last_read_at ? all : { ...all, [k]: r.last_read_at };
    });
  }, []);

  /** Busca tudo de novo (ao conectar, reconectar ou voltar para o app): nada se perde se a conexão cair. */
  const fetchAll = useCallback(async () => {
    const [msgs, rd] = await Promise.all([
      supabase.from("messages").select("id, student_id, sender_id, body, created_at").order("created_at", { ascending: true }).limit(5000),
      supabase.from("chat_reads").select("user_id, student_id, last_read_at"),
    ]);
    if (!msgs.error) {
      setMessages((list) => {
        const server = (msgs.data as Row[]).map(toMsg);
        const ids = new Set(server.map((m) => m.id));
        const local = list.filter((m) => m.state && !ids.has(m.id)); // envios ainda pendentes
        return [...server, ...local].sort(byTime);
      });
    }
    if (!rd.error) {
      const next: Record<string, string> = {};
      for (const r of rd.data as ReadRow[]) next[readKey(r.user_id, r.student_id)] = r.last_read_at;
      setReads((all) => {
        // não volta atrás uma leitura otimista mais nova
        for (const [k, v] of Object.entries(all)) if (!next[k] || next[k] < v) next[k] = v;
        return next;
      });
    }
    if (!msgs.error && !rd.error) setReady(true);
  }, []);

  // mensagens e leituras em tempo real
  useEffect(() => {
    if (!me) return;
    setMessages([]);
    setReads({});
    setReady(false);
    const filter = isMentor ? undefined : `student_id=eq.${me}`;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    void (async () => {
      await supabase.realtime.setAuth(); // canais privados usam o login do usuário
      if (cancelled) return;
      channel = supabase
        .channel(`mensagens:${me}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", ...(filter ? { filter } : {}) }, (p) =>
          upsertMessage(toMsg(p.new as Row)),
        )
        .on("postgres_changes", { event: "*", schema: "public", table: "chat_reads", ...(filter ? { filter } : {}) }, (p) => {
          if (p.new && "user_id" in p.new) upsertRead(p.new as ReadRow);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void fetchAll();
        });
    })();
    const onVisible = () => document.visibilityState === "visible" && void fetchAll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [me, isMentor, fetchAll, upsertMessage, upsertRead]);

  // equipe online: o mentor marca presença; os alunos só observam
  useEffect(() => {
    if (!me) return;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    void (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase.channel("equipe-online", { config: { private: true, presence: { key: me } } });
      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState();
          setTeamOnline(Object.keys(state).some((k) => k !== me));
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED" && isMentor) void channel!.track({ online_at: new Date().toISOString() });
        });
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [me, isMentor]);

  // canal da conversa: "digitando…" e presença. O aluno fica sempre no dele; o mentor, no da conversa aberta.
  const convId = isMentor ? active : me;
  useEffect(() => {
    if (!me || !convId) return;
    setTypingUntil(0);
    setStudentOnline(false);
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    void (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase.channel(`chat:${convId}`, { config: { private: true, presence: { key: me } } });
      channel
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.user_id && payload.user_id !== me) setTypingUntil(Date.now() + 3500);
        })
        .on("presence", { event: "sync" }, () => {
          setStudentOnline(Object.keys(channel!.presenceState()).includes(convId) && convId !== me);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void channel!.track({ online_at: new Date().toISOString() });
        });
      convChannel.current = channel;
    })();
    return () => {
      cancelled = true;
      convChannel.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [me, convId]);

  // apaga o "digitando…" depois de alguns segundos sem sinal
  useEffect(() => {
    if (!typingUntil) return;
    const t = window.setTimeout(() => tick((n) => n + 1), Math.max(0, typingUntil - Date.now()) + 50);
    return () => window.clearTimeout(t);
  }, [typingUntil]);

  const insert = useCallback(
    async (m: ChatMessage) => {
      const { data, error } = await supabase
        .from("messages")
        .insert({ id: m.id, student_id: m.studentId, body: m.body })
        .select("id, student_id, sender_id, body, created_at")
        .single();
      if (error || !data) upsertMessage({ ...m, state: "failed" });
      else upsertMessage(toMsg(data as Row));
    },
    [upsertMessage],
  );

  const send = useCallback(
    (studentId: string, body: string) => {
      const text = body.trim();
      if (!me || !text) return;
      const m: ChatMessage = { id: crypto.randomUUID(), studentId, senderId: me, body: text.slice(0, 4000), createdAt: new Date().toISOString(), state: "sending" };
      upsertMessage(m);
      setTypingUntil(0);
      void insert(m);
    },
    [me, insert, upsertMessage],
  );

  const retry = useCallback(
    (id: string) => {
      const m = messages.find((x) => x.id === id);
      if (!m) return;
      const again = { ...m, state: "sending" as const };
      upsertMessage(again);
      void insert(again);
    },
    [messages, insert, upsertMessage],
  );

  const conversation = useCallback((studentId: string) => messages.filter((m) => m.studentId === studentId), [messages]);

  const unread = useCallback(
    (studentId: string) => {
      if (!me) return 0;
      const since = reads[readKey(me, studentId)] ?? "";
      return messages.filter((m) => m.studentId === studentId && m.senderId !== me && !m.state && m.createdAt > since).length;
    },
    [me, messages, reads],
  );

  const markRead = useCallback(
    (studentId: string) => {
      if (!me || unread(studentId) === 0) return;
      const latest = messages.filter((m) => m.studentId === studentId).at(-1)?.createdAt ?? new Date().toISOString();
      upsertRead({ user_id: me, student_id: studentId, last_read_at: latest });
      void supabase
        .from("chat_reads")
        .upsert({ user_id: me, student_id: studentId, last_read_at: latest }, { onConflict: "user_id,student_id" })
        .select("user_id, student_id, last_read_at")
        .single()
        .then(({ data }) => data && upsertRead(data as ReadRow));
    },
    [me, messages, unread, upsertRead],
  );

  const seenUntil = useCallback(
    (studentId: string) => {
      if (!me) return null;
      if (!isMentor) {
        // qualquer pessoa da equipe que leu
        let best: string | null = null;
        for (const id of mentorIds) {
          const v = reads[readKey(id, studentId)];
          if (v && (!best || v > best)) best = v;
        }
        return best;
      }
      return reads[readKey(studentId, studentId)] ?? null;
    },
    [me, isMentor, mentorIds, reads],
  );

  const notifyTyping = useCallback(() => {
    const ch = convChannel.current;
    if (!ch || !me || Date.now() - lastTypingSent.current < 2000) return;
    lastTypingSent.current = Date.now();
    void ch.send({ type: "broadcast", event: "typing", payload: { user_id: me } });
  }, [me]);

  // ao chegar mensagem do outro lado, some o "digitando…"
  const lastOther = useMemo(() => {
    const conv = convId ? messages.filter((m) => m.studentId === convId && m.senderId !== me) : [];
    return conv.at(-1)?.id;
  }, [messages, convId, me]);
  useEffect(() => setTypingUntil(0), [lastOther]);

  const totalUnread = useMemo(() => {
    if (!me) return 0;
    const ids = new Set(messages.map((m) => m.studentId));
    let n = 0;
    for (const id of ids) n += unread(id);
    return n;
  }, [me, messages, unread]);

  const value: Chat = {
    ready,
    messages,
    conversation,
    send,
    retry,
    markRead,
    unread,
    totalUnread,
    seenUntil,
    setActive,
    typing: typingUntil > Date.now(),
    notifyTyping,
    peerOnline: isMentor ? studentOnline : teamOnline,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChat(): Chat {
  const c = useContext(Ctx);
  if (!c) throw new Error("useChat fora do ChatProvider");
  return c;
}
