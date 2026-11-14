import type { Module } from "../data/seed";

// A assinatura visual da plataforma: cada aula do módulo é um segmento,
// com largura proporcional à duração. Preenchido = concluída.
export function LessonStrip({ module, isDone, currentId }: { module: Module; isDone: (id: string) => boolean; currentId?: string }) {
  const done = module.lessons.filter((l) => isDone(l.id)).length;
  return (
    <div
      className="strip"
      role="img"
      aria-label={`${done} de ${module.lessons.length} aulas concluídas`}
    >
      {module.lessons.map((l) => (
        <span
          key={l.id}
          className={`strip-seg${isDone(l.id) ? " is-done" : ""}${l.id === currentId ? " is-current" : ""}`}
          style={{ flexGrow: l.durationMin }}
          title={l.title}
        />
      ))}
    </div>
  );
}
