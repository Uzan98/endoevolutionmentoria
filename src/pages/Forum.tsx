import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { useStore } from "../store";
import type { Reply, Thread } from "../data/forum";
import { initials, plural, timeAgo } from "../lib/format";

type Filter = "todas" | "sem-resposta" | "resolvidas" | "minhas";

/** Situação de uma dúvida, a partir das respostas. */
export function threadStatus(t: Thread, replies: Reply[], mentorIds: Set<string>) {
  const mine = replies.filter((r) => r.threadId === t.id);
  if (t.solutionId) return { key: "resolvida", label: "Resolvida", pill: "pill-positive" } as const;
  if (mine.some((r) => mentorIds.has(r.authorId))) return { key: "mentor", label: "Mentor respondeu", pill: "pill-accent" } as const;
  if (mine.length === 0) return { key: "sem", label: "Sem resposta", pill: "pill-warning" } as const;
  return { key: "discussao", label: "Em discussão", pill: "pill-neutral" } as const;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Forum() {
  const { db, user } = useStore();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>(user?.role === "mentor" ? "sem-resposta" : "todas");
  const [moduleId, setModuleId] = useState("");
  const [q, setQ] = useState("");
  const composing = params.get("nova") === "1";

  const mentorIds = useMemo(() => new Set(db.users.filter((u) => u.role === "mentor").map((u) => u.id)), [db.users]);
  if (!user) return null;

  const status = (t: Thread) => threadStatus(t, db.replies, mentorIds);
  const replyCount = (id: string) => db.replies.filter((r) => r.threadId === id).length;

  // contagens das abas sobre o recorte de busca e módulo, para baterem com a lista
  const base = db.threads.filter(
    (t) => (!moduleId || t.moduleId === moduleId) && (!q.trim() || norm(`${t.title} ${t.body}`).includes(norm(q.trim()))),
  );
  const byFilter: Record<Filter, Thread[]> = {
    todas: base,
    "sem-resposta": base.filter((t) => status(t).key === "sem"),
    resolvidas: base.filter((t) => t.solutionId),
    minhas: base.filter((t) => t.authorId === user.id),
  };
  const list = [...byFilter[filter]].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tabs: { id: Filter; label: string }[] = [
    { id: "todas", label: "Todas" },
    { id: "sem-resposta", label: "Sem resposta" },
    { id: "resolvidas", label: "Resolvidas" },
    { id: "minhas", label: "Minhas" },
  ];

  const openComposer = () => setParams({ nova: "1" });
  const closeComposer = () => setParams({});

  return (
    <div className="page">
      <header className="page-head page-head-row">
        <div>
          <h1 className="title">Fórum de dúvidas</h1>
          <p className="muted">Pergunte, responda e aprenda com a turma. O mentor acompanha todas as perguntas.</p>
        </div>
        <button className="btn btn-primary" onClick={openComposer}>
          <Icon name="plus" size={18} /> Nova pergunta
        </button>
      </header>

      <div className="forum-tools">
        <div className="tabs" role="tablist" aria-label="Filtrar dúvidas">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={filter === t.id} className="tab" onClick={() => setFilter(t.id)}>
              {t.label} <span className="muted num">{byFilter[t.id].length}</span>
            </button>
          ))}
        </div>
        <div className="forum-search">
          <input className="search-input" type="search" placeholder="Buscar nas dúvidas…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar nas dúvidas" />
          <select className="select" value={moduleId} onChange={(e) => setModuleId(e.target.value)} aria-label="Filtrar por módulo">
            <option value="">Todos os módulos</option>
            {db.modules.map((m, i) => (
              <option key={m.id} value={m.id}>
                {i + 1}. {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {list.length ? (
        <ul className="thread-list">
          {list.map((t) => {
            const author = db.users.find((u) => u.id === t.authorId);
            const mod = db.modules.find((m) => m.id === t.moduleId);
            const lesson = mod?.lessons.find((l) => l.id === t.lessonId);
            const st = status(t);
            const n = replyCount(t.id);
            return (
              <li key={t.id}>
                <Link to={`/forum/${t.id}`} className="thread-row">
                  <span className={`vote-count${t.votes.includes(user.id) ? " is-on" : ""}`} title="Também têm essa dúvida">
                    <Icon name="vote" size={16} />
                    <strong>{t.votes.length}</strong>
                  </span>
                  <span className="thread-main">
                    <span className="thread-title-line">
                      <strong className="thread-title">{t.title}</strong>
                      <span className={`pill ${st.pill}`}>{st.label}</span>
                    </span>
                    <span className="thread-excerpt">{t.body}</span>
                    <span className="thread-meta">
                      <span className="mini-avatar" aria-hidden="true">{author ? initials(author.name) : "?"}</span>
                      {author?.name ?? "Aluno removido"} · {timeAgo(t.createdAt)}
                      {mod && <span className="thread-tag">{lesson ? lesson.title : mod.title}</span>}
                    </span>
                  </span>
                  <span className="thread-replies">
                    <Icon name="forum" size={18} />
                    {plural(n, "resposta", "respostas")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty">
          {filter === "sem-resposta"
            ? "Nenhuma dúvida esperando resposta. Tudo em dia!"
            : filter === "minhas"
              ? "Você ainda não fez nenhuma pergunta."
              : "Nenhuma dúvida encontrada com esses filtros."}
        </p>
      )}

      {composing && <Composer onClose={closeComposer} initialLessonId={params.get("aula") ?? undefined} />}
    </div>
  );
}

function Composer({ onClose, initialLessonId }: { onClose: () => void; initialLessonId?: string }) {
  const { db, createThread } = useStore();
  const nav = useNavigate();
  const initialModule = db.modules.find((m) => m.lessons.some((l) => l.id === initialLessonId))?.id ?? "";
  const [form, setForm] = useState({ title: "", body: "", moduleId: initialModule, lessonId: initialLessonId ?? "" });
  const [error, setError] = useState("");
  const mod = db.modules.find((m) => m.id === form.moduleId);

  useEffect(() => setError(""), [form.title, form.body, form.moduleId]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 8) return setError("Escreva um título com pelo menos 8 caracteres.");
    if (!form.moduleId) return setError("Escolha o módulo da dúvida.");
    if (form.body.trim().length < 15) return setError("Descreva a dúvida com um pouco mais de detalhe.");
    const id = createThread({ title: form.title.trim(), body: form.body.trim(), moduleId: form.moduleId, lessonId: form.lessonId || undefined });
    nav(`/forum/${id}`, { replace: true });
  };

  return (
    <Dialog title="Nova pergunta" onClose={onClose}>
      <form className="form-stack" onSubmit={submit} noValidate>
        <label className="field">
          <span>Título</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ex.: Como confirmar a patência em canal atresiado?"
            autoFocus
            maxLength={120}
          />
        </label>
        <div className="field-row field-row-2">
          <label className="field">
            <span>Módulo</span>
            <select className="select" value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value, lessonId: "" })}>
              <option value="">Escolha…</option>
              {db.modules.map((m, i) => (
                <option key={m.id} value={m.id}>
                  {i + 1}. {m.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Aula (opcional)</span>
            <select className="select" value={form.lessonId} onChange={(e) => setForm({ ...form, lessonId: e.target.value })} disabled={!mod}>
              <option value="">Dúvida geral do módulo</option>
              {mod?.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Sua dúvida</span>
          <textarea
            rows={6}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Conte o contexto: o dente, o que você já tentou e onde travou."
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="row-gap end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            Publicar pergunta
          </button>
        </div>
      </form>
    </Dialog>
  );
}
