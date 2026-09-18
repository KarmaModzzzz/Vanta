importScripts("./scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function handleRequest(event) {
  try {
    await scramjet.loadConfig();
  } catch (err) {
    // A stale/corrupt IndexedDB record from an older deploy makes loadConfig
    // throw forever. Don't let that produce an uncaught rejection per request
    // or block the page — fall straight through to a normal fetch and tell
    // the page so it can wipe storage on its next boot attempt.
    console.error("[VANTA sw] loadConfig failed, passing request through:", err);
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
