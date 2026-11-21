import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import { useChat, type ChatMessage } from "../chat";
import { Icon, ToothLogo } from "../components/Icon";
import { PushNudge } from "../components/Notifications";
import { clock, dayLabel, firstName, initials, listTime } from "../lib/format";

const SUGGESTIONS = ["Tenho uma dúvida sobre um caso clínico", "Não consigo acessar uma aula", "Dúvida sobre o encontro ao vivo"];

export function Messages() {
  const { user } = useStore();
  if (!user) return null;
  return user.role === "mentor" ? <MentorInbox /> : <StudentChat studentId={user.id} />;
}

/** Aluno: uma conversa só, com a equipe. */
function StudentChat({ studentId }: { studentId: string }) {
  const chat = useChat();
  const status = chat.typing ? "digitando…" : chat.peerOnline ? "online agora" : "Respondemos em até 1 dia útil";
  return (
    <div className="page page-chat">
      <header className="page-head chat-page-head">
        <h1 className="title">Mensagens</h1>
        <p className="muted">Fale direto com a equipe da mentoria. Dúvidas sobre aulas que podem ajudar a turma rendem mais no fórum.</p>
      </header>
      <section className="chat card" aria-label="Conversa com a equipe">
        <Conversation
          studentId={studentId}
          avatar={<span className="chat-avatar chat-avatar-team"><ToothLogo size={26} /></span>}
          title="Equipe Endo Evolution"
          status={status}
          live={chat.typing || chat.peerOnline}
          empty={(fill) => (
            <div className="chat-empty">
              <span className="icon-chip icon-chip-solid"><Icon name="chat" size={22} /></span>
              <strong>Mande sua primeira mensagem</strong>
              <p className="muted">A equipe recebe na hora e responde por aqui. Você vê quando sua mensagem foi lida.</p>
              <div className="chat-suggest">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chip-btn" onClick={() => fill(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
        />
      </section>
    </div>
  );
}

/** Mentor: lista de conversas + conversa aberta. */
function MentorInbox() {
  const { db, user } = useStore();
  const chat = useChat();
  const [params, setParams] = useSearchParams();
  const selected = params.get("aluno");
  const [q, setQ] = useState("");

  const students = useMemo(() => db.users.filter((u) => u.role !== "mentor"), [db.users]);
  const rows = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return students
      .map((s) => ({ s, last: chat.conversation(s.id).filter((m) => !m.state || m.senderId === user?.id).at(-1), unread: chat.unread(s.id) }))
      .filter((r) => !q.trim() || norm(r.s.name).includes(norm(q.trim())))
      .sort((a, b) => {
        if (a.last && b.last) return b.last.createdAt.localeCompare(a.last.createdAt);
        if (a.last || b.last) return a.last ? -1 : 1;
        return a.s.name.localeCompare(b.s.name);
      });
  }, [students, chat, q, user?.id]);

  const current = students.find((s) => s.id === selected) ?? null;
  const open = (id: string | null) => setParams(id ? { aluno: id } : {}, { replace: !!selected && !!id });

  useEffect(() => {
    chat.setActive(current?.id ?? null);
    return () => chat.setActive(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const status = current ? (chat.typing ? "digitando…" : chat.peerOnline ? "online agora" : current.city ?? "Aluno") : "";
  const waiting = rows.filter((r) => r.unread > 0).length;

  return (
    <div className={`page page-chat${current ? " has-open" : ""}`}>
      <header className="page-head chat-page-head">
        <h1 className="title">Mensagens</h1>
        <p className="muted">
          {waiting > 0 ? `${waiting === 1 ? "1 aluno aguardando" : `${waiting} alunos aguardando`} resposta.` : "Nenhuma conversa aguardando resposta."}
        </p>
      </header>
      <section className="chat chat-split card" aria-label="Conversas com os alunos">
        <aside className="chat-list" aria-label="Conversas">
          <div className="chat-list-search">
            <Icon name="search" size={18} />
            <input placeholder="Buscar aluno" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar aluno" />
          </div>
          <ul aria-busy={!chat.ready}>
            {!chat.ready && <li className="pop-empty">Carregando conversas…</li>}
            {chat.ready && rows.map(({ s, last, unread }) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`chat-row${s.id === current?.id ? " active" : ""}${unread ? " is-unread" : ""}`}
                  onClick={() => open(s.id)}
                  aria-current={s.id === current?.id ? "true" : undefined}
                >
                  <span className="chat-avatar">{initials(s.name)}</span>
                  <span className="chat-row-main">
                    <span className="chat-row-top">
                      <strong>{s.name}</strong>
                      {last && <time dateTime={last.createdAt}>{listTime(last.createdAt)}</time>}
                    </span>
                    <span className="chat-row-bottom">
                      <span className="chat-row-preview">
                        {last ? `${last.senderId === user?.id ? "Você: " : ""}${last.body}` : "Sem mensagens ainda"}
                      </span>
                      {unread > 0 && <span className="nav-badge chat-unread" aria-label={`${unread} não lidas`}>{unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {chat.ready && rows.length === 0 && <li className="pop-empty">Nenhum aluno encontrado.</li>}
          </ul>
        </aside>
        <div className="chat-pane">
          {current ? (
            <Conversation
              key={current.id}
              studentId={current.id}
              onBack={() => open(null)}
              avatar={<span className="chat-avatar">{initials(current.name)}</span>}
              title={current.name}
              status={status}
              live={chat.typing || chat.peerOnline}
              empty={() => (
                <div className="chat-empty">
                  <span className="icon-chip icon-chip-solid"><Icon name="chat" size={22} /></span>
                  <strong>Comece a conversa com {firstName(current.name)}</strong>
                  <p className="muted">A mensagem aparece na hora para o aluno, no app e no site.</p>
                </div>
              )}
            />
          ) : (
            <div className="chat-empty chat-none">
              <span className="icon-chip icon-chip-solid"><Icon name="chat" size={22} /></span>
              <strong>Escolha uma conversa</strong>
              <p className="muted">As mensagens dos alunos chegam aqui em tempo real.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

interface ConversationProps {
  studentId: string;
  avatar: ReactNode;
  title: string;
  status: string;
  live: boolean;
  onBack?: () => void;
  empty: (fill: (text: string) => void) => ReactNode;
}

function Conversation({ studentId, avatar, title, status, live, onBack, empty }: ConversationProps) {
  const { user } = useStore();
  const chat = useChat();
  const me = user!.id;
  const isMentorView = user!.role === "mentor";
  const messages = chat.conversation(studentId);
  const unread = chat.unread(studentId);
  const seen = chat.seenUntil(studentId);
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true); // acompanha o fim da conversa enquanto a pessoa estiver lá embaixo
  const coarse = useMemo(() => window.matchMedia?.("(pointer: coarse)").matches ?? false, []);

  // leu o que está na tela (só com o app visível)
  useEffect(() => {
    const mark = () => document.visibilityState === "visible" && chat.markRead(studentId);
    if (unread > 0) mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [unread, studentId, chat]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, chat.typing]);

  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const submit = () => {
    if (!text.trim()) return;
    chat.send(studentId, text);
    setText("");
    stick.current = true;
    input.current?.focus();
  };
  const fill = (s: string) => {
    setText(`${s}: `);
    input.current?.focus();
  };

  // última mensagem minha já enviada: mostra "Visto" ou "Enviada"
  const lastMine = [...messages].reverse().find((m) => m.senderId === me && !m.state);

  return (
    <div className="convo">
      <header className="convo-head">
        {onBack && (
          <button type="button" className="icon-btn convo-back" aria-label="Voltar para as conversas" onClick={onBack}>
            <Icon name="back" size={22} />
          </button>
        )}
        {avatar}
        <span className="convo-who">
          <strong>{title}</strong>
          <span className={`convo-status${live ? " is-live" : ""}`} aria-live="polite">{status}</span>
        </span>
      </header>
      <PushNudge text={isMentorView ? "Ative as notificações para saber na hora quando um aluno escrever." : "Ative as notificações para saber na hora quando a equipe responder."} />

      <div
        className="convo-body"
        ref={scroller}
        role="log"
        aria-label={`Mensagens com ${title}`}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {!chat.ready && messages.length === 0 ? (
          <p className="chat-loading">Carregando conversa…</p>
        ) : messages.length === 0 ? (
          empty(fill)
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
            const grouped = !newDay && prev && prev.senderId === m.senderId && Date.parse(m.createdAt) - Date.parse(prev.createdAt) < 5 * 60000;
            return (
              <Fragment key={m.id}>
                {newDay && <p className="convo-day"><span>{dayLabel(m.createdAt)}</span></p>}
                <Bubble m={m} mine={m.senderId === me} grouped={!!grouped} onRetry={() => chat.retry(m.id)} />
                {m === lastMine && (
                  <p className="bubble-receipt">{seen && seen >= m.createdAt ? "Visto" : "Enviada"}</p>
                )}
              </Fragment>
            );
          })
        )}
        {chat.typing && (
          <div className="bubble-row" aria-hidden="true">
            <span className="bubble bubble-typing"><i /><i /><i /></span>
          </div>
        )}
      </div>

      <form
        className="convo-compose"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={input}
          className="chat-input"
          rows={1}
          maxLength={4000}
          placeholder="Escreva sua mensagem…"
          aria-label="Mensagem"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim()) chat.notifyTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="submit" className="convo-send" aria-label="Enviar mensagem" disabled={!text.trim()}>
          <Icon name="send" size={20} />
        </button>
      </form>
    </div>
  );
}

/** Links só com http(s): nada de javascript: ou data: vindo de mensagens. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow">{p}</a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function Bubble({ m, mine, grouped, onRetry }: { m: ChatMessage; mine: boolean; grouped: boolean; onRetry: () => void }) {
  return (
    <div className={`bubble-row${mine ? " mine" : ""}${grouped ? " grouped" : ""}`}>
      <div className={`bubble${m.state ? ` is-${m.state}` : ""}`}>
        <p><Linkified text={m.body} /></p>
        <span className="bubble-meta">
          {m.state === "sending" ? (
            <><Icon name="clock" size={12} /> enviando</>
          ) : (
            <time dateTime={m.createdAt}>{clock(m.createdAt)}</time>
          )}
        </span>
      </div>
      {m.state === "failed" && (
        <button type="button" className="bubble-retry" onClick={onRetry}>
          Não enviada. Tentar de novo
        </button>
      )}
    </div>
  );
}
