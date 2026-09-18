importScripts("./scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

const SCOPE_BASE = new URL(self.registration.scope).pathname; // e.g. "/Vanta/"
const PROXY_PREFIX = SCOPE_BASE + "service/";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function handleRequest(event) {
  const url = new URL(event.request.url);

  // Only requests actually headed into the Scramjet proxy need loadConfig()
  // and the bare-mux transport. Everything else — our own site's HTML, CSS,
  // JS, images — must skip straight through. Routing *everything* through
  // loadConfig() (as the plain Scramjet quickstart example does) makes the
  // service worker fight bare-mux for a SharedWorker port on every normal
  // page asset, often before the window side has set up its half of that
  // channel — that's what was producing the endless "invalid MessagePort"
  // / IndexedDB spam.
  if (url.origin !== location.origin || !url.pathname.startsWith(PROXY_PREFIX)) {
    return fetch(event.request);
  }

  try {
    await scramjet.loadConfig();
  } catch (err) {
    console.error("[VANTA sw] loadConfig failed:", err);
    try {
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: "vanta-sw-corrupt" }));
    } catch {}
    return fetch(event.request);
  }

  if (scramjet.route(event)) return scramjet.fetch(event);
  return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});
