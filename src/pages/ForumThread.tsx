import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { useStore } from "../store";
import { initials, plural, timeAgo } from "../lib/format";
import { threadStatus } from "./Forum";

export function ForumThread() {
  const { threadId } = useParams();
  const { db, user, addReply, deleteReply, deleteThread, toggleVote, markSolution } = useStore();
  const nav = useNavigate();
  const [text, setText] = useState("");
  const thread = db.threads.find((t) => t.id === threadId);

  if (!user) return null;
  if (!thread)
    return (
      <div className="page">
        <Link to="/forum" className="back"><Icon name="back" /> Fórum de dúvidas</Link>
        <h1 className="title">Dúvida não encontrada</h1>
        <p className="muted">Ela pode ter sido removida.</p>
      </div>
    );

  const isMentor = user.role === "mentor";
  const mentorIds = new Set(db.users.filter((u) => u.role === "mentor").map((u) => u.id));
  const author = db.users.find((u) => u.id === thread.authorId);
  const mod = db.modules.find((m) => m.id === thread.moduleId);
  const modIdx = mod ? db.modules.indexOf(mod) : -1;
  const lesson = mod?.lessons.find((l) => l.id === thread.lessonId);
  const canManageThread = isMentor || thread.authorId === user.id;
  const st = threadStatus(thread, db.replies, mentorIds);

  // a resposta que resolveu vem primeiro; o resto em ordem de chegada
  const replies = db.replies
    .filter((r) => r.threadId === thread.id)
    .sort((a, b) => (a.id === thread.solutionId ? -1 : b.id === thread.solutionId ? 1 : a.createdAt.localeCompare(b.createdAt)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addReply(thread.id, text.trim());
    setText("");
  };

  const person = (id: string) => db.users.find((u) => u.id === id);

  return (
    <div className="page page-thread">
      <Link to="/forum" className="back"><Icon name="back" /> Fórum de dúvidas</Link>

      <article className="card thread-card">
        <div className="thread-head">
          <span className={`pill ${st.pill}`}>{st.label}</span>
          {mod && (
            <span className="thread-tag">
              Módulo {modIdx + 1}
              {lesson ? ` · ${lesson.title}` : ` · ${mod.title}`}
            </span>
          )}
        </div>
        <h1 className="thread-h1">{thread.title}</h1>
        <p className="thread-body">{thread.body}</p>
        <div className="thread-foot">
          <span className="thread-meta">
            <span className="mini-avatar" aria-hidden="true">{author ? initials(author.name) : "?"}</span>
            {author?.name ?? "Aluno removido"} · {timeAgo(thread.createdAt)}
          </span>
          <div className="row-gap">
            {lesson && mod && (
              <Link to={`/modulos/${mod.id}/aulas/${lesson.id}`} className="btn btn-ghost btn-sm">
                <Icon name="play" size={14} /> Ver aula
              </Link>
            )}
            {thread.authorId !== user.id && (
            <button
              className={`btn btn-sm ${thread.votes.includes(user.id) ? "btn-secondary is-on" : "btn-ghost"}`}
              onClick={() => toggleVote("thread", thread.id)}
              aria-pressed={thread.votes.includes(user.id)}
            >
              <Icon name="vote" size={16} /> Também tenho essa dúvida · {thread.votes.length}
            </button>
            )}
            {canManageThread && (
              <button
                className="icon-btn danger"
                aria-label="Excluir pergunta"
                onClick={() => {
                  if (confirm("Excluir esta pergunta e todas as respostas?")) {
                    deleteThread(thread.id);
                    nav("/forum", { replace: true });
                  }
                }}
              >
                <Icon name="trash" />
              </button>
            )}
          </div>
        </div>
      </article>

      <section className="block">
        <h2 className="panel-title">{replies.length ? plural(replies.length, "resposta", "respostas") : "Nenhuma resposta ainda"}</h2>
        <ul className="reply-list">
          {replies.map((r) => {
            const who = person(r.authorId);
            const fromMentor = mentorIds.has(r.authorId);
            const isSolution = r.id === thread.solutionId;
            const voted = r.votes.includes(user.id);
            return (
              <li key={r.id} className={`reply${fromMentor ? " is-mentor" : ""}${isSolution ? " is-solution" : ""}`}>
                {isSolution && (
                  <p className="solution-flag">
                    <Icon name="solved" size={16} /> Resolveu a dúvida
                  </p>
                )}
                <div className="reply-head">
                  <span className={`mini-avatar${fromMentor ? " is-mentor" : ""}`} aria-hidden="true">{who ? initials(who.name) : "?"}</span>
                  <strong>{who?.name ?? "Usuário removido"}</strong>
                  {fromMentor && <span className="pill pill-accent">Mentor</span>}
                  <span className="muted">· {timeAgo(r.createdAt)}</span>
                </div>
                <p className="reply-body">{r.body}</p>
                <div className="reply-actions">
                  <button className={`chip-btn${voted ? " is-on" : ""}`} onClick={() => toggleVote("reply", r.id)} aria-pressed={voted}>
                    <Icon name="vote" size={14} /> Útil · {r.votes.length}
                  </button>
                  {canManageThread && (
                    <button className="chip-btn" onClick={() => markSolution(thread.id, isSolution ? null : r.id)}>
                      <Icon name="solved" size={14} /> {isSolution ? "Desmarcar solução" : "Marcar como solução"}
                    </button>
                  )}
                  {(isMentor || r.authorId === user.id) && (
                    <button className="chip-btn chip-danger" onClick={() => confirm("Excluir esta resposta?") && deleteReply(r.id)}>
                      <Icon name="trash" size={14} /> Excluir
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {replies.length === 0 && <p className="empty">Seja o primeiro a ajudar. O mentor também é avisado das perguntas novas.</p>}
      </section>

      <form className="card reply-form" onSubmit={submit}>
        <label className="panel-title" htmlFor="reply">
          {isMentor ? "Responder como mentor" : "Sua resposta"}
        </label>
        <textarea
          id="reply"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isMentor ? "Escreva a orientação para o aluno…" : "Compartilhe o que funcionou para você…"}
        />
        <button className="btn btn-primary" type="submit" disabled={!text.trim()}>
          <Icon name="reply" size={16} /> Responder
        </button>
      </form>
    </div>
  );
}
