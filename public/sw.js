const CACHE_NAME = "joule-shell-v2";

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

  // Navigations (the app shell) and stylesheets: network first.
  // Stylesheets are linked by plain filename (style.css, mobile.css),
  // not run through Vite's hashed-asset pipeline the way genuinely
  // immutable chunks are — so "same URL" does NOT mean "same content"
  // for them, and cache-first was silently freezing them at whatever
  // was fetched on a person's very first visit. Falls back to
  // whatever was last cached if the network is unreachable.
  if (request.mode === "navigate" || new URL(request.url).pathname.endsWith(".css")) {
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

  // Everything else (Vite's genuinely hashed JS chunks, images,
  // fonts): cache first is correct here because these DO change URL
  // when their content changes.
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
