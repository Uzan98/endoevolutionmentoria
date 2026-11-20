import { useEffect, useState } from "react";

// O Chrome/Android dispara "beforeinstallprompt" uma vez, logo no carregamento.
// Guardamos o evento aqui (registrado em main.tsx) para o botão "Instalar" usar depois.
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function capturePWAInstall() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const DISMISS_KEY = "endoevolution:install-dismissed";

/** Estado do convite para instalar o app. */
export function usePWAInstall() {
  const [, force] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const standalone = isStandalone();
  const mode: "android" | "ios" | null = standalone ? null : deferred ? "android" : isIOS() ? "ios" : null;

  return {
    mode,
    visible: mode !== null && !dismissed,
    install: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      emit();
    },
    dismiss: () => {
      setDismissed(true);
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    },
  };
}

/** true quando o aparelho está sem internet. */
export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

// ---------------------------------------------------------------- atualizações do app instalado
// O app instalado fica aberto em segundo plano e quase nunca recarrega; por isso procuramos versão
// nova ao voltar para ele e a cada 30 min. Quando há versão nova:
// * logo após abrir (antes de a pessoa mexer) ou com o app em segundo plano: recarrega sozinho;
// * no meio do uso: mostra "Nova versão disponível" e aplica ao sair do app (sem perder o que está digitando).
let updateReady = false;
const updateListeners = new Set<() => void>();

export function registerAppUpdates() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
  let hadController = !!navigator.serviceWorker.controller; // a primeira instalação não é "versão nova"
  const startedAt = Date.now();
  let reloading = false;
  const reload = () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (document.visibilityState === "hidden" || Date.now() - startedAt < 8000) return reload();
    updateReady = true;
    updateListeners.forEach((l) => l());
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        const check = () => void reg.update().catch(() => {});
        window.setInterval(check, 30 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
          else if (updateReady) reload(); // saiu do app: volta já na versão nova
        });
        window.addEventListener("online", check);
      })
      .catch(() => {});
  });
}

/** true quando uma versão nova foi baixada e falta só recarregar. */
export function useAppUpdate() {
  const [ready, setReady] = useState(updateReady);
  useEffect(() => {
    const l = () => setReady(true);
    updateListeners.add(l);
    return () => {
      updateListeners.delete(l);
    };
  }, []);
  return { ready, apply: () => window.location.reload() };
}

// ---------------------------------------------------------------- teclado no celular
// Mede a área visível de verdade (sem o teclado) em --vvh e marca html.kbd-open quando o teclado
// está aberto. O layout só muda DEPOIS que o teclado abriu: mexer na tela no momento do toque
// pode impedir o teclado de abrir em alguns aparelhos.
export function trackKeyboard() {
  const vv = window.visualViewport;
  if (!vv || !window.matchMedia("(pointer: coarse)").matches) return;
  const root = document.documentElement;
  let full = vv.height;
  let raf = 0;
  const apply = () => {
    raf = 0;
    if (vv.scale > 1.05) return; // zoom com os dedos: não é teclado
    full = Math.max(full, vv.height);
    const open = vv.height < full * 0.8;
    root.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
    // o Safari desloca a área visível ao abrir o teclado: o chat acompanha esse deslocamento
    root.style.setProperty("--vv-top", `${Math.round(vv.offsetTop)}px`);
    root.classList.toggle("kbd-open", open);
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };
  vv.addEventListener("resize", schedule);
  vv.addEventListener("scroll", schedule);
  window.addEventListener("orientationchange", () => {
    full = 0; // nova orientação: mede de novo
    setTimeout(schedule, 300);
  });
  apply();
}
