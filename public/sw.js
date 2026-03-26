self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const { title, body, tag, data: notifData } = data;

  event.waitUntil(
    self.registration.showNotification(title || "Hookah Queue", {
      body: body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: tag || "hookah-queue",
      renotify: true,
      data: notifData,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
