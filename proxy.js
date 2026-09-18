/* VANTA — Scramjet integration
 * Everything here is static and runs from GitHub Pages.
 * The only external dependency is the Wisp WebSocket endpoint (see config.js).
 */
(function () {
  // Works at the repo root ("/") and at a project path ("/Vanta/").
  const BASE = location.pathname.replace(/[^/]*$/, "");
  const SETTINGS_KEY = "vanta-settings";

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

    status("registering service worker...");
    await navigator.serviceWorker.register(BASE + "sw.js", { scope: BASE });
    await navigator.serviceWorker.ready;

    status("connecting transport...");
    connection = new BareMux.BareMuxConnection(BASE + "baremux/worker.js");
    await connection.setTransport(BASE + "epoxy/index.mjs", [{ wisp: wispUrl() }]);

    const { ScramjetController } = $scramjetLoadController();
    controller = new ScramjetController({
      prefix: BASE + "service/",
      files: {
        wasm: BASE + "scram/scramjet.wasm.wasm",
        all: BASE + "scram/scramjet.all.js",
        sync: BASE + "scram/scramjet.sync.js"
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
      booting = boot().catch((err) => {
        booting = null;
        throw err;
      });
    }
    return booting;
  }

  // Called from Settings when the Wisp URL changes.
  function reset() {
    controller = null;
    connection = null;
    booting = null;
    status("not connected");
    wakeHost();
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
      status(err.message || "failed to start", false);
      window.VANTA_TOAST && window.VANTA_TOAST(err.message || "Proxy failed to start");
    }
  }

  window.VantaProxy = { launch, ready, reset, wispUrl, status };

  // Free hosts like Render sleep after idle. Ping the plain http(s) URL as
  // soon as the site opens so the instance is (hopefully) awake by the time
  // someone visits the Proxy page and hits GO. This is fire-and-forget —
  // it doesn't block anything and its failure/success isn't reported.
  function wakeHost() {
    const w = wispUrl();
    if (!w) return;
    const httpUrl = w.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
    fetch(httpUrl, { mode: "no-cors", cache: "no-store" }).catch(() => {});
  }
  wakeHost();

  // Pre-warm the service worker so the first click is fast.
  if (wispUrl()) {
    status("idle — press GO to connect");
  } else {
    status("no Wisp server configured", false);
  }
})();
