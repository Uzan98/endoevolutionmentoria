import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { VideoPlayer } from "../components/VideoPlayer";
import { moduleProgress, useStore } from "../store";
import { duration, plural, timeAgo } from "../lib/format";

export function LessonPage() {
  const { moduleId, lessonId } = useParams();
  const { db, user, isDone, toggleDone, setLastLesson, setNote } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const mIdx = db.modules.findIndex((m) => m.id === moduleId);
  const m = db.modules[mIdx];
  const lIdx = m?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
  const lesson = m?.lessons[lIdx];

  const savedNote = (user && lesson && db.notes[user.id]?.[lesson.id]) || "";
  const [note, setNoteDraft] = useState(savedNote);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setNoteDraft(savedNote);
    setSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => {
    if (lesson) setLastLesson(lesson.id);
  }, [lesson, setLastLesson]);

  // Vindo de "Nova anotação": leva direto ao campo de anotações.
  useEffect(() => {
    if (loc.hash !== "#anotacoes") return;
    const t = window.setTimeout(() => {
      const el = document.getElementById("note");
      el?.scrollIntoView({ block: "center" });
      el?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(t);
  }, [loc.hash, lessonId]);

  if (!m || !lesson)
    return (
      <div className="page">
        <h1 className="title">Aula não encontrada</h1>
        <Link to="/modulos" className="link">Voltar para os módulos</Link>
      </div>
    );

  // Próxima aula: a seguinte do módulo, ou a primeira do próximo módulo.
  const nextInModule = m.lessons[lIdx + 1];
  const nextModule = db.modules[mIdx + 1];
  const next = nextInModule
    ? { mod: m, lesson: nextInModule }
    : nextModule?.lessons[0]
      ? { mod: nextModule, lesson: nextModule.lessons[0] }
      : null;
  const prev = m.lessons[lIdx - 1];
  const done = isDone(lesson.id);
  const p = moduleProgress(m, isDone);

  const lessonThreads = db.threads.filter((t) => t.lessonId === lesson.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const goNext = () => next && nav(`/modulos/${next.mod.id}/aulas/${next.lesson.id}`);

  const saveNote = () => {
    setNote(lesson.id, note);
    setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  };

  return (
    <div className="page page-lesson">
      <Link to={`/modulos/${m.id}`} className="back">
        <Icon name="back" /> Módulo {mIdx + 1} · {m.title}
      </Link>

      <div className="lesson-layout">
        <div className="lesson-main">
          <VideoPlayer url={lesson.videoUrl} title={lesson.title} onEnded={() => toggleDone(lesson.id, true)} />

          <div className="lesson-head">
            <div>
              <p className="muted">
                Aula {lIdx + 1} de {m.lessons.length} · {duration(lesson.durationMin)}
              </p>
              <h1 className="title">{lesson.title}</h1>
            </div>
            <div className="row-gap">
              <button className={`btn ${done ? "btn-secondary" : "btn-primary"}`} onClick={() => toggleDone(lesson.id)} aria-pressed={done}>
                {done ? (
                  <>
                    <Icon name="check" /> Concluída
                  </>
                ) : (
                  "Marcar como concluída"
                )}
              </button>
              {next && (
                <button className="btn btn-secondary" onClick={goNext}>
                  Próxima aula <Icon name="chevron" />
                </button>
              )}
            </div>
          </div>

          <p className="lead">{lesson.description}</p>

          <section className="block">
            <h2 className="panel-title">Materiais de apoio</h2>
            {lesson.materials.length ? (
              <ul className="materials">
                {lesson.materials.map((mat) => (
                  <li key={mat.id}>
                    <a href={mat.url} target="_blank" rel="noreferrer" className="material">
                      <Icon name="file" /> {mat.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Esta aula não tem materiais para download.</p>
            )}
          </section>

          <section className="block">
            <div className="block-head">
              <h2 className="panel-title">
                <Icon name="forum" size={18} /> Dúvidas desta aula
              </h2>
              <Link to={`/forum?nova=1&aula=${lesson.id}`} className="btn btn-secondary btn-sm">
                <Icon name="plus" size={14} /> Perguntar sobre esta aula
              </Link>
            </div>
            {lessonThreads.length ? (
              <ul className="mini-threads">
                {lessonThreads.slice(0, 3).map((t) => {
                  const n = db.replies.filter((r) => r.threadId === t.id).length;
                  return (
                    <li key={t.id}>
                      <Link to={`/forum/${t.id}`} className="mini-thread">
                        <strong>{t.title}</strong>
                        <span className="muted">
                          {plural(n, "resposta", "respostas")} · {timeAgo(t.createdAt)}
                          {t.solutionId ? " · resolvida" : ""}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty">Ninguém perguntou sobre esta aula ainda.</p>
            )}
            {lessonThreads.length > 3 && (
              <Link to="/forum" className="link">Ver as {lessonThreads.length} dúvidas no fórum</Link>
            )}
          </section>

          <section className="block" id="anotacoes">
            <label className="panel-title" htmlFor="note">
              Minhas anotações
            </label>
            <textarea
              id="note"
              className="note"
              rows={5}
              value={note}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Escreva aqui o que você quer lembrar desta aula."
            />
            <div className="row-gap">
              <button className="btn btn-secondary" onClick={saveNote} disabled={note === savedNote}>
                Salvar anotação
              </button>
              {savedAt && <span className="caption">Salva às {savedAt}</span>}
            </div>
          </section>
        </div>

        <aside className="lesson-side" aria-label="Aulas do módulo">
          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">{m.title}</h2>
              <span className="muted num">
                {p.done}/{p.total}
              </span>
            </div>
            <ol className="side-lessons">
              {m.lessons.map((l, i) => (
                <li key={l.id}>
                  <Link
                    to={`/modulos/${m.id}/aulas/${l.id}`}
                    className={`side-lesson${l.id === lesson.id ? " is-current" : ""}`}
                    aria-current={l.id === lesson.id ? "page" : undefined}
                  >
                    <span className={`check${isDone(l.id) ? " is-done" : ""}`}>{isDone(l.id) ? <Icon name="check" size={14} /> : i + 1}</span>
                    <span className="side-lesson-name">{l.title}</span>
                    <span className="muted num">{l.durationMin} min</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
          {prev && (
            <Link to={`/modulos/${m.id}/aulas/${prev.id}`} className="link">
              <Icon name="back" /> Aula anterior: {prev.title}
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
