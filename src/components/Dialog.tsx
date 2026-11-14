import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

/** Diálogo modal nativo (<dialog>): foco preso, Esc fecha. */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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
