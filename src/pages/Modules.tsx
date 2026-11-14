import { Link } from "react-router-dom";
import { LessonStrip } from "../components/LessonStrip";
import { moduleProgress, useStore } from "../store";
import { duration, plural } from "../lib/format";

export function Modules() {
  const { db, isDone, allLessons } = useStore();
  const doneAll = allLessons.filter((l) => isDone(l.id)).length;
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="title">Módulos</h1>
        <p className="muted">
          {plural(db.modules.length, "módulo", "módulos")} · {doneAll} de {allLessons.length} aulas concluídas
        </p>
      </header>

      {db.modules.length === 0 && <p className="empty">Nenhum módulo publicado ainda.</p>}

      <ol className="module-list">
        {db.modules.map((m, i) => {
          const p = moduleProgress(m, isDone);
          const status = p.total && p.done === p.total ? "Concluído" : p.done ? "Em andamento" : "Não iniciado";
          const pill = p.total && p.done === p.total ? "pill-positive" : p.done ? "pill-accent" : "pill-neutral";
          return (
            <li key={m.id}>
              <Link to={`/modulos/${m.id}`} className="module-row">
                <span className="module-num" aria-hidden="true">{i + 1}</span>
                <span className="module-main">
                  <span className="module-title-line">
                    <strong className="module-title">{m.title}</strong>
                    <span className={`pill ${pill}`}>{status}</span>
                  </span>
                  <span className="muted">{m.description}</span>
                  <LessonStrip module={m} isDone={isDone} />
                </span>
                <span className="module-meta">
                  <span className="num">
                    {p.done} de {plural(p.total, "aula", "aulas")}
                  </span>
                  <span className="muted num">{duration(p.minutes)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
