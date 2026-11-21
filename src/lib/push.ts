import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { isStandalone } from "./pwa";

// Notificações push: inscrição do aparelho e preferências.
// Envio: Edge Function enviar-push (supabase/functions/enviar-push).

const VAPID_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? "";

export type PushState =
  | "loading"
  | "unsupported" // navegador sem suporte
  | "needs-install" // iPhone/iPad no Safari: só funciona com o app instalado
  | "denied" // a pessoa bloqueou
  | "off"
  | "on";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const pushSupported = () =>
  !!VAPID_KEY && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const keyBytes = (b64: string) => {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const sameKey = (buf: ArrayBuffer | null | undefined) => {
  if (!buf) return false;
  const a = new Uint8Array(buf), b = keyBytes(VAPID_KEY);
  return a.length === b.length && a.every((x, i) => x === b[i]);
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Registro do service worker, sem esperar para sempre (no modo de desenvolvimento não existe). */
async function registration(timeoutMs = 4000): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), timeoutMs))]);
}

async function save(sub: PushSubscription) {
  const j = sub.toJSON();
  const { error } = await supabase.rpc("registrar_aparelho", {
    p_endpoint: j.endpoint,
    p_p256dh: j.keys?.p256dh,
    p_auth: j.keys?.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

async function subscribe(reg: ServiceWorkerRegistration) {
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options.applicationServerKey)) {
    await sub.unsubscribe(); // inscrição antiga com outra chave do servidor
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_KEY) });
  await save(sub);
}

/** Pede permissão (precisa vir de um toque) e inscreve este aparelho. */
export async function enablePush(): Promise<{ ok: boolean; message?: string }> {
  if (!pushSupported()) return { ok: false, message: "Este navegador não recebe notificações." };
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      emit();
      return {
        ok: false,
        message:
          perm === "denied"
            ? "As notificações foram bloqueadas. Libere nas configurações do aparelho ou do navegador."
            : "Permissão não concedida. Toque em Ativar de novo quando quiser.",
      };
    }
    const reg = await registration(10000);
    if (!reg) return { ok: false, message: "O app ainda está terminando de instalar. Tente de novo em instantes." };
    await subscribe(reg);
    emit();
    return { ok: true };
  } catch {
    emit();
    return { ok: false, message: "Não foi possível ativar agora. Verifique a internet e tente de novo." };
  }
}

/** Para de receber neste aparelho. */
export async function disablePush() {
  try {
    const reg = await registration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } finally {
    emit();
  }
}

/** Ao sair da conta: o aparelho para de receber as notificações desta pessoa. */
export async function forgetDevice() {
  try {
    const reg = await registration(1500);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch {
    /* sair da conta não pode falhar por isso */
  }
}

/** Ao abrir o app logado: se a permissão já foi dada, confirma a inscrição (renova chave e dono). */
export async function syncPush() {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await registration();
    if (reg) await subscribe(reg);
  } catch {
    /* tenta de novo na próxima abertura */
  } finally {
    emit();
  }
}

/** Notificação de teste para o próprio aparelho. */
export async function testPush(): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke("enviar-push", { body: { type: "test" } });
  if (error) return { ok: false, message: "Não foi possível enviar o teste agora." };
  return data?.sent > 0
    ? { ok: true, message: "Enviada! Ela deve aparecer em alguns segundos." }
    : { ok: false, message: "Nenhum aparelho ativo encontrado. Ative as notificações de novo." };
}

/** Situação das notificações neste aparelho. */
export function usePushState(): PushState {
  const [state, setState] = useState<PushState>("loading");
  const check = useCallback(async () => {
    if (!pushSupported()) return setState(isIOS() && !isStandalone() ? "needs-install" : "unsupported");
    if (Notification.permission === "denied") return setState("denied");
    if (Notification.permission !== "granted") return setState("off");
    const reg = await registration();
    const sub = await reg?.pushManager.getSubscription();
    setState(sub ? "on" : "off");
  }, []);
  useEffect(() => {
    void check();
    listeners.add(check);
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      listeners.delete(check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);
  return state;
}

export interface NotificationPrefs {
  chat: boolean;
  forum: boolean;
  meetings: boolean;
  lessons: boolean;
}
const DEFAULT_PREFS: NotificationPrefs = { chat: true, forum: true, meetings: true, lessons: true };

/** O que a pessoa quer receber (vale para todos os aparelhos dela). */
export function useNotificationPrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    if (!userId) return;
    void supabase
      .from("notification_prefs")
      .select("chat, forum, meetings, lessons")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => data && setPrefs(data as NotificationPrefs));
  }, [userId]);
  const update = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      if (!userId) return;
      const next = { ...prefs, ...patch };
      setPrefs(next);
      const { error } = await supabase.from("notification_prefs").upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() });
      if (error) setPrefs(prefs);
    },
    [prefs, userId],
  );
  return { prefs, update };
}

/** Número de mensagens não lidas no ícone do app (onde o aparelho permite). */
export function setAppBadge(n: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (n > 0) void nav.setAppBadge?.(n)?.catch(() => {});
    else void nav.clearAppBadge?.()?.catch(() => {});
  } catch {
    /* sem suporte */
  }
}
