import { useEffect, useState } from "react";

// Tema: "system" segue o aparelho; "light"/"dark" fixam a escolha.
// O index.html aplica o tema antes do React carregar (sem piscar branco).
export type ThemeChoice = "system" | "light" | "dark";
const KEY = "endoevolution:theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export const resolveTheme = (choice: ThemeChoice): "light" | "dark" =>
  choice === "system" ? (media().matches ? "dark" : "light") : choice;

function apply(choice: ThemeChoice) {
  document.documentElement.dataset.theme = resolveTheme(choice);
}

const listeners = new Set<(c: ThemeChoice) => void>();

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    /* sem armazenamento: vale só para esta visita */
  }
  apply(choice);
  listeners.forEach((l) => l(choice));
}

/** Tema escolhido + tema efetivo, sincronizados entre componentes e com o sistema. */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readTheme);
  const [effective, setEffective] = useState(() => resolveTheme(readTheme()));
  useEffect(() => {
    const onChoice = (c: ThemeChoice) => {
      setChoice(c);
      setEffective(resolveTheme(c));
    };
    const onSystem = () => {
      if (readTheme() === "system") {
        apply("system");
        setEffective(resolveTheme("system"));
      }
    };
    listeners.add(onChoice);
    const m = media();
    m.addEventListener("change", onSystem);
    return () => {
      listeners.delete(onChoice);
      m.removeEventListener("change", onSystem);
    };
  }, []);
  return { choice, effective, setTheme, toggle: () => setTheme(effective === "dark" ? "light" : "dark") };
}
