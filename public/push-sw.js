/* Notificações push (carregado pelo service worker gerado pelo Workbox). */
const isStrictSafari = /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Android/.test(navigator.userAgent);

self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { title: "Endo Evolution", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    (async () => {
      if (typeof d.badge === "number" && self.navigator.setAppBadge) {
        try {
          if (d.badge > 0) await self.navigator.setAppBadge(d.badge);
          else await self.navigator.clearAppBadge();
        } catch {}
      }
      const url = d.url || "/";
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // já está com essa tela aberta e em uso: não precisa avisar
      // (o Safari exige mostrar sempre; lá a notificação aparece mesmo assim)
      const viewing = wins.some((w) => {
        const u = new URL(w.url);
        return w.visibilityState === "visible" && w.focused && u.pathname + u.search === url;
      });
      if (viewing && !isStrictSafari) return;
      await self.registration.showNotification(d.title || "Endo Evolution", {
        body: d.body || "",
        tag: d.tag,
        renotify: Boolean(d.tag),
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        lang: "pt-BR",
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (win) {
        await win.focus();
        win.postMessage({ type: "abrir", url }); // o app troca de tela sem recarregar
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
