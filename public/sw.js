// Service worker do SINCRO — usado para exibir notificações locais de ponto
// (compatível com Android/Chrome, onde o construtor `new Notification()` é
// bloqueado) e para tratar cliques/push.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Notificação enviada por push (para uso futuro com Web Push).
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { titulo: "SINCRO", mensagem: event.data ? event.data.text() : "" };
  }
  const titulo = payload.titulo || "SINCRO";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: payload.mensagem || "",
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
      tag: payload.tag || "lembrete-ponto",
      renotify: true,
      data: { link: payload.link || "/ponto" },
    }),
  );
});

// Clique na notificação: foca uma aba existente ou abre o app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/ponto";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(link);
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(link);
      }),
  );
});
