const CACHE_NAME = "joule-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever handle same-origin GETs. Anything to the API (a
  // different origin entirely — Render, not Vercel) or any
  // non-GET request passes straight through untouched.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Navigations (the app shell itself): network first, so a signed-in
  // user always gets the latest deploy when they're online. Falls
  // back to whatever was last cached if the network is unreachable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Everything else (Vite's hashed JS/CSS, images, fonts): cache
  // first. A hashed asset never changes under the same URL, so once
  // it's cached there's no need to hit the network for it again.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
