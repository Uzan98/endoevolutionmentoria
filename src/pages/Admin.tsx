import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { VideoPlayer } from "../components/VideoPlayer";
import { uid, useStore } from "../store";
import type { Lesson, LiveMeeting, Material, Module } from "../data/seed";
import { duration, meetingDate, plural } from "../lib/format";

type Tab = "conteudo" | "alunos" | "encontros";
type Editing = { kind: "module"; data: Module } | { kind: "lesson"; moduleId: string; data: Lesson } | null;

export function Admin() {
  const [tab, setTab] = useState<Tab>("conteudo");
  const { db, allLessons, resetDemo } = useStore();
  const students = db.users.filter((u) => u.role === "aluno");
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "conteudo", label: "Conteúdo", count: allLessons.length },
    { id: "alunos", label: "Alunos", count: students.length },
    { id: "encontros", label: "Encontros", count: db.meetings.length },
  ];

  return (
    <div className="page">
      <header className="page-head page-head-row">
        <div>
          <h1 className="title">Painel do mentor</h1>
          <p className="muted">
            {plural(db.modules.length, "módulo", "módulos")} · {plural(allLessons.length, "aula", "aulas")} ·{" "}
            {plural(students.length, "aluno", "alunos")}
          </p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (confirm("Restaurar todo o conteúdo de demonstração? As alterações feitas serão perdidas.")) resetDemo();
          }}
        >
          Restaurar dados de demonstração
        </button>
      </header>

      <div className="tabs" role="tablist" aria-label="Seções do painel">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
            {t.label} <span className="muted num">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "conteudo" && <ContentTab />}
      {tab === "alunos" && <StudentsTab />}
      {tab === "encontros" && <MeetingsTab />}
    </div>
  );
}

/* ---------------- Conteúdo ---------------- */

function ContentTab() {
  const { db, deleteModule, moveModule, deleteLesson, moveLesson } = useStore();
  const [editing, setEditing] = useState<Editing>(null);

  const newModule = () => setEditing({ kind: "module", data: { id: uid("mod"), title: "", description: "", lessons: [] } });
  const newLesson = (moduleId: string) =>
    setEditing({ kind: "lesson", moduleId, data: { id: uid("aula"), title: "", description: "", durationMin: 10, videoUrl: "", materials: [] } });

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="panel-title">Módulos e aulas</h2>
        <button className="btn btn-primary" onClick={newModule}>
          <Icon name="plus" /> Novo módulo
        </button>
      </div>

      {db.modules.length === 0 && <p className="empty">Nenhum módulo ainda. Crie o primeiro para começar a publicar aulas.</p>}

      <ol className="admin-modules">
        {db.modules.map((m, i) => (
          <li key={m.id} className="admin-module">
            <div className="admin-module-head">
              <div>
                <strong className="module-title">
                  {i + 1}. {m.title}
                </strong>
                <p className="muted">
                  {plural(m.lessons.length, "aula", "aulas")} · {duration(m.lessons.reduce((s, l) => s + l.durationMin, 0))}
                </p>
              </div>
              <div className="actions">
                <button className="icon-btn" aria-label={`Subir ${m.title}`} disabled={i === 0} onClick={() => moveModule(m.id, -1)}>
                  <Icon name="up" />
                </button>
                <button className="icon-btn" aria-label={`Descer ${m.title}`} disabled={i === db.modules.length - 1} onClick={() => moveModule(m.id, 1)}>
                  <Icon name="down" />
                </button>
                <button className="icon-btn" aria-label={`Editar ${m.title}`} onClick={() => setEditing({ kind: "module", data: m })}>
                  <Icon name="edit" />
                </button>
                <button
                  className="icon-btn danger"
                  aria-label={`Excluir ${m.title}`}
                  onClick={() => confirm(`Excluir o módulo "${m.title}" e suas ${m.lessons.length} aulas?`) && deleteModule(m.id)}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </div>

            <ol className="admin-lessons">
              {m.lessons.map((l, j) => (
                <li key={l.id} className="admin-lesson">
                  <span className="muted num">{j + 1}</span>
                  <span className="admin-lesson-name">
                    {l.title}
                    {!l.videoUrl && <span className="pill pill-warning">Sem vídeo</span>}
                  </span>
                  <span className="muted num">{duration(l.durationMin)}</span>
                  <span className="actions">
                    <button className="icon-btn" aria-label={`Subir ${l.title}`} disabled={j === 0} onClick={() => moveLesson(m.id, l.id, -1)}>
                      <Icon name="up" />
                    </button>
                    <button className="icon-btn" aria-label={`Descer ${l.title}`} disabled={j === m.lessons.length - 1} onClick={() => moveLesson(m.id, l.id, 1)}>
                      <Icon name="down" />
                    </button>
                    <button className="icon-btn" aria-label={`Editar ${l.title}`} onClick={() => setEditing({ kind: "lesson", moduleId: m.id, data: l })}>
                      <Icon name="edit" />
                    </button>
                    <button className="icon-btn danger" aria-label={`Excluir ${l.title}`} onClick={() => confirm(`Excluir a aula "${l.title}"?`) && deleteLesson(m.id, l.id)}>
                      <Icon name="trash" />
                    </button>
                  </span>
                </li>
              ))}
              {m.lessons.length === 0 && <li className="empty">Este módulo ainda não tem aulas.</li>}
            </ol>
            <button className="link add-link" onClick={() => newLesson(m.id)}>
              <Icon name="plus" /> Adicionar aula
            </button>
          </li>
        ))}
      </ol>

      {editing && <Editor editing={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-label={title}>
      <div className="dialog-head">
        <h2 className="title-sm">{title}</h2>
        <button className="icon-btn" aria-label="Fechar" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function Editor({ editing, onClose }: { editing: NonNullable<Editing>; onClose: () => void }) {
  const { db, saveModule, saveLesson } = useStore();
  const isNew =
    editing.kind === "module"
      ? !db.modules.some((m) => m.id === editing.data.id)
      : !db.modules.find((m) => m.id === editing.moduleId)?.lessons.some((l) => l.id === editing.data.id);

  if (editing.kind === "module") return <ModuleForm initial={editing.data} isNew={isNew} onClose={onClose} onSave={saveModule} />;
  return <LessonForm initial={editing.data} isNew={isNew} onClose={onClose} onSave={(l) => saveLesson(editing.moduleId, l)} />;
}

function ModuleForm({ initial, isNew, onClose, onSave }: { initial: Module; isNew: boolean; onClose: () => void; onSave: (m: Module) => void }) {
  const [m, setM] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!m.title.trim()) return;
    onSave({ ...m, title: m.title.trim() });
    onClose();
  };
  return (
    <Dialog title={isNew ? "Novo módulo" : "Editar módulo"} onClose={onClose}>
      <form onSubmit={submit} className="form-stack">
        <label className="field">
          <span>Título</span>
          <input value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} required autoFocus />
        </label>
        <label className="field">
          <span>Descrição</span>
          <textarea rows={3} value={m.description} onChange={(e) => setM({ ...m, description: e.target.value })} />
        </label>
        <div className="row-gap end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">{isNew ? "Criar módulo" : "Salvar"}</button>
        </div>
      </form>
    </Dialog>
  );
}

function LessonForm({ initial, isNew, onClose, onSave }: { initial: Lesson; isNew: boolean; onClose: () => void; onSave: (l: Lesson) => void }) {
  const [l, setL] = useState(initial);
  const setMat = (i: number, patch: Partial<Material>) => setL({ ...l, materials: l.materials.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!l.title.trim()) return;
    onSave({ ...l, title: l.title.trim(), materials: l.materials.filter((m) => m.name.trim() && m.url.trim()) });
    onClose();
  };
  return (
    <Dialog title={isNew ? "Nova aula" : "Editar aula"} onClose={onClose}>
      <form onSubmit={submit} className="form-stack">
        <label className="field">
          <span>Título</span>
          <input value={l.title} onChange={(e) => setL({ ...l, title: e.target.value })} required autoFocus />
        </label>
        <label className="field">
          <span>Link do vídeo</span>
          <input
            value={l.videoUrl}
            onChange={(e) => setL({ ...l, videoUrl: e.target.value })}
            placeholder="https://youtu.be/… ou https://vimeo.com/…"
            aria-describedby="video-hint"
          />
          <small id="video-hint" className="caption">Aceita YouTube (não listado), Vimeo ou um arquivo .mp4.</small>
        </label>
        {l.videoUrl && <VideoPlayer url={l.videoUrl} title="Pré-visualização" />}
        <label className="field field-short">
          <span>Duração (minutos)</span>
          <input type="number" min={1} value={l.durationMin} onChange={(e) => setL({ ...l, durationMin: Math.max(1, Number(e.target.value) || 1) })} />
        </label>
        <label className="field">
          <span>Descrição</span>
          <textarea rows={3} value={l.description} onChange={(e) => setL({ ...l, description: e.target.value })} />
        </label>
        <fieldset className="field">
          <legend>Materiais de apoio</legend>
          {l.materials.map((mat, i) => (
            <div key={mat.id} className="material-edit">
              <input aria-label="Nome do material" placeholder="Nome" value={mat.name} onChange={(e) => setMat(i, { name: e.target.value })} />
              <input aria-label="Link do material" placeholder="Link (PDF, Drive…)" value={mat.url} onChange={(e) => setMat(i, { url: e.target.value })} />
              <button type="button" className="icon-btn danger" aria-label="Remover material" onClick={() => setL({ ...l, materials: l.materials.filter((_, j) => j !== i) })}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
          <button type="button" className="link add-link" onClick={() => setL({ ...l, materials: [...l.materials, { id: uid("mat"), name: "", url: "" }] })}>
            <Icon name="plus" /> Adicionar material
          </button>
        </fieldset>
        <div className="row-gap end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">{isNew ? "Publicar aula" : "Salvar"}</button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- Alunos ---------------- */

function StudentsTab() {
  const { db, allLessons, isDone, addStudent } = useStore();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", city: "" });
  const students = db.users.filter((u) => u.role === "aluno");
  const rows = students.map((s) => {
    const doneIds = allLessons.filter((l) => isDone(l.id, s.id));
    const dates = Object.values(db.progress[s.id] ?? {}).map((p) => p.completedAt).sort();
    return { s, done: doneIds.length, last: dates[dates.length - 1] };
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    addStudent({ name: form.name.trim(), email: form.email.trim(), city: form.city.trim() });
    setForm({ name: "", email: "", city: "" });
    setAdding(false);
  };

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="panel-title">Alunos da turma</h2>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" /> Cadastrar aluno
        </button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Cidade</th>
              <th className="r">Aulas concluídas</th>
              <th className="r">Progresso</th>
              <th className="r">Última aula concluída</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, done, last }) => {
              const pct = allLessons.length ? Math.round((done / allLessons.length) * 100) : 0;
              return (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <span className="muted cell-sub">{s.email}</span>
                  </td>
                  <td>{s.city || <span className="faint">—</span>}</td>
                  <td className="r num">
                    {done} <span className="muted">de {allLessons.length}</span>
                  </td>
                  <td className="r">
                    <span className="bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                    <span className="num">{pct}%</span>
                  </td>
                  <td className="r num">{last ? new Date(last).toLocaleDateString("pt-BR") : <span className="faint">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {adding && (
        <Dialog title="Cadastrar aluno" onClose={() => setAdding(false)}>
          <form onSubmit={submit} className="form-stack">
            <label className="field">
              <span>Nome completo</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required aria-describedby="pw-hint" />
              <small id="pw-hint" className="caption">O aluno entra com este e-mail e a senha inicial demo123.</small>
            </label>
            <label className="field">
              <span>Cidade</span>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </label>
            <div className="row-gap end">
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Cadastrar</button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}

/* ---------------- Encontros ---------------- */

function MeetingsTab() {
  const { db, saveMeeting, deleteMeeting } = useStore();
  const [form, setForm] = useState({ title: "", date: "", time: "20:00", durationMin: 90, link: "" });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    const m: LiveMeeting = {
      id: uid("enc"),
      title: form.title.trim(),
      startsAt: new Date(`${form.date}T${form.time || "20:00"}`).toISOString(),
      durationMin: form.durationMin,
      link: form.link.trim() || "https://meet.google.com/",
    };
    saveMeeting(m);
    setForm({ ...form, title: "", date: "", link: "" });
  };

  return (
    <section className="block admin-meetings">
      <div>
        <h2 className="panel-title">Agenda</h2>
        <ul className="rows">
          {db.meetings.map((m) => (
            <li key={m.id} className="row-card row-split">
              <span>
                <strong>{m.title}</strong>
                <span className="muted">{meetingDate(m.startsAt)} · {duration(m.durationMin)}</span>
              </span>
              <button className="icon-btn danger" aria-label={`Excluir ${m.title}`} onClick={() => deleteMeeting(m.id)}>
                <Icon name="trash" />
              </button>
            </li>
          ))}
          {db.meetings.length === 0 && <li className="empty">Nenhum encontro agendado.</li>}
        </ul>
      </div>
      <form className="settings-panel" onSubmit={submit}>
        <h2 className="panel-title">Agendar encontro</h2>
        <label className="field">
          <span>Tema</span>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Data</span>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </label>
          <label className="field">
            <span>Horário</span>
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </label>
          <label className="field">
            <span>Duração (min)</span>
            <input type="number" min={15} step={15} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) || 60 })} />
          </label>
        </div>
        <label className="field">
          <span>Link da sala</span>
          <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Google Meet, Zoom…" />
        </label>
        <button className="btn btn-primary" type="submit">Agendar</button>
      </form>
    </section>
  );
}
