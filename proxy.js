/* VANTA — Scramjet integration
 * Everything here is static and runs from GitHub Pages.
 * The only external dependency is the Wisp WebSocket endpoint (see config.js).
 */
(function () {
  // Bump this whenever sw.js / worker paths change. It forces the browser to
  // treat these as new URLs, so it can't reuse a stuck SharedWorker or a
  // corrupted IndexedDB record left over from an older deploy.
  const V = "3";
  const BASE = location.pathname.replace(/[^/]*$/, "");
  const SETTINGS_KEY = "vanta-settings";
  const BOOT_TIMEOUT_MS = 9000;

  let controller = null;
  let connection = null;
  let booting = null;

  function readSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; }
  }

  function wispUrl() {
    const custom = (readSettings().wisp || "").trim();
    return custom || window.VANTA_WISP_URL || "";
  }

  function status(text, ok) {
    const el = document.querySelector("#proxyStatus");
    if (!el) return;
    el.innerHTML = "<b>Scramjet status:</b> " + text;
    el.style.color = ok === false ? "#ff4d6d" : ok === true ? "#7ee787" : "#666";
  }

  function withTimeout(promise, ms, message) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(message)), ms);
      promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
  }

  // Wipes any leftover scramjet/bare-mux IndexedDB databases. Needed because
  // a schema mismatch between deploys shows up as
  // "NotFoundError: ...object store was not found" and wedges everything.
  async function wipeStorage() {
    try {
      if (!indexedDB.databases) return;
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs
          .filter((d) => /scramjet|bare-?mux/i.test(d.name || ""))
          .map(
            (d) =>
              new Promise((res) => {
                const req = indexedDB.deleteDatabase(d.name);
                req.onsuccess = req.onerror = req.onblocked = () => res();
              })
          )
      );
    } catch (e) {
      console.warn("[VANTA proxy] wipeStorage failed", e);
    }
  }

  async function unregisterServiceWorkers() {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.filter((r) => (r.scope || "").includes(BASE)).map((r) => r.unregister()));
    } catch (e) {
      console.warn("[VANTA proxy] unregister failed", e);
    }
  }

  // Full teardown: kills the service worker registration and wipes storage
  // so the next boot() starts completely clean. Doesn't kill an already-live
  // SharedWorker in *other* open tabs of this site — closing those tabs is
  // still the only way to do that; this is the automatic half of the fix.
  async function hardReset() {
    controller = null;
    connection = null;
    booting = null;
    status("resetting...");
    await unregisterServiceWorkers();
    await wipeStorage();
    status("reset — press GO to reconnect");
  }

  async function boot() {
    if (!window.isSecureContext) {
      throw new Error("Service workers need https:// (or localhost). Open the GitHub Pages URL, not the local file.");
    }
    if (!("serviceWorker" in navigator)) {
      throw new Error("This browser has service workers disabled — the proxy can't run.");
    }
    if (!wispUrl()) {
      throw new Error("No Wisp server configured. Add one in Settings.");
    }

    await wipeStorage();

    status("registering service worker...");
    await navigator.serviceWorker.register(BASE + "sw.js?v=" + V, { scope: BASE });
    await navigator.serviceWorker.ready;

    status("connecting transport...");
    connection = new BareMux.BareMuxConnection(BASE + "baremux/worker.js?v=" + V);
    await connection.setTransport(BASE + "epoxy/index.mjs?v=" + V, [{ wisp: wispUrl() }]);

    const { ScramjetController } = $scramjetLoadController();
    controller = new ScramjetController({
      prefix: BASE + "service/",
      files: {
        wasm: BASE + "scram/scramjet.wasm.wasm?v=" + V,
        all: BASE + "scram/scramjet.all.js?v=" + V,
        sync: BASE + "scram/scramjet.sync.js?v=" + V
      },
      flags: {
        strictRewrites: true,
        captureErrors: true,
        cleanErrors: true,
        sourcemaps: true,
        allowInvalidJs: true,
        allowFailedIntercepts: true
      }
    });

    await controller.init();
    status("ready • " + wispUrl(), true);
    return controller;
  }

  function ready() {
    if (!booting) {
      booting = withTimeout(
        boot(),
        BOOT_TIMEOUT_MS,
        "Timed out connecting — a stuck cache from an earlier deploy is the usual cause."
      ).catch(async (err) => {
        booting = null;
        // Self-heal: whatever got stuck, clear it so the *next* click starts fresh.
        await hardReset();
        throw err;
      });
    }
    return booting;
  }

  // Called from Settings when the Wisp URL changes, or from the manual
  // "Reset proxy" button.
  function reset() {
    return hardReset();
  }

  function openFrame(url) {
    const overlay = document.createElement("div");
    overlay.className = "game-overlay";
    overlay.innerHTML =
      '<div class="game-frame-wrap">' +
        '<div class="game-frame-head"><b>VANTA</b>' +
        '<span class="proxy-frame-url"></span>' +
        '<button class="game-close">&times;</button></div>' +
      "</div>";
    document.body.appendChild(overlay);

    const frame = controller.createFrame();
    overlay.querySelector(".game-frame-wrap").appendChild(frame.frame);

    const label = overlay.querySelector(".proxy-frame-url");
    label.textContent = url;
    frame.frame.addEventListener("load", () => {
      try { label.textContent = controller.decodeUrl(frame.frame.contentWindow.location.pathname) || url; } catch {}
    });

    overlay.querySelector(".game-close").onclick = () => overlay.remove();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    if (typeof frame.go === "function") frame.go(url);
    else frame.navigate(url);
  }

  async function launch(url) {
    status("starting...");
    try {
      await ready();
      openFrame(url);
    } catch (err) {
      console.error("[VANTA proxy]", err);
      status((err.message || "failed to start") + " — reset, try GO again", false);
      window.VANTA_TOAST && window.VANTA_TOAST(err.message || "Proxy failed to start — try again");
    }
  }

  window.VantaProxy = { launch, ready, reset, hardReset, wispUrl, status };

  // Free hosts like Render sleep after idle. Ping the plain http(s) URL as
  // soon as the site opens so the instance is (hopefully) awake by the time
  // someone visits the Proxy page and hits GO. Fire-and-forget.
  function wakeHost() {
    const w = wispUrl();
    if (!w) return;
    const httpUrl = w.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
    fetch(httpUrl, { mode: "no-cors", cache: "no-store" }).catch(() => {});
  }
  wakeHost();

  if (wispUrl()) {
    status("idle — press GO to connect");
  } else {
    status("no Wisp server configured", false);
  }
})();
