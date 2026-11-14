import { Link, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { LessonStrip } from "../components/LessonStrip";
import { moduleProgress, useStore } from "../store";
import { duration, plural } from "../lib/format";

export function ModulePage() {
  const { moduleId } = useParams();
  const { db, isDone } = useStore();
  const idx = db.modules.findIndex((m) => m.id === moduleId);
  const m = db.modules[idx];
  if (!m)
    return (
      <div className="page">
        <h1 className="title">Módulo não encontrado</h1>
        <Link to="/modulos" className="link">Voltar para os módulos</Link>
      </div>
    );
  const p = moduleProgress(m, isDone);
  const next = m.lessons.find((l) => !isDone(l.id)) ?? m.lessons[0];

  return (
    <div className="page">
      <Link to="/modulos" className="back"><Icon name="back" /> Módulos</Link>
      <header className="module-hero">
        <div>
          <p className="muted">Módulo {idx + 1} de {db.modules.length}</p>
          <h1 className="title">{m.title}</h1>
          <p className="lead">{m.description}</p>
        </div>
        <div className="module-hero-side">
          <p className="kpi">
            {p.done} <span className="unit">de {plural(p.total, "aula", "aulas")}</span>
          </p>
          <LessonStrip module={m} isDone={isDone} />
          <p className="caption">{duration(p.minutes)} de conteúdo</p>
          {next && (
            <Link to={`/modulos/${m.id}/aulas/${next.id}`} className="btn btn-primary">
              {p.done === 0 ? "Começar módulo" : p.done === p.total ? "Rever módulo" : "Continuar módulo"}
            </Link>
          )}
        </div>
      </header>

      {m.lessons.length === 0 ? (
        <p className="empty">As aulas deste módulo serão publicadas em breve.</p>
      ) : (
        <ol className="lesson-table">
          {m.lessons.map((l, i) => (
            <li key={l.id}>
              <Link to={`/modulos/${m.id}/aulas/${l.id}`} className="lesson-row">
                <span className={`check${isDone(l.id) ? " is-done" : ""}`} aria-label={isDone(l.id) ? "Concluída" : "Não concluída"}>
                  {isDone(l.id) ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <span className="lesson-row-main">
                  <strong>{l.title}</strong>
                  <span className="muted">{l.description}</span>
                </span>
                <span className="lesson-row-meta">
                  {l.materials.length > 0 && <span className="muted">{plural(l.materials.length, "material", "materiais")}</span>}
                  <span className="num">{duration(l.durationMin)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
