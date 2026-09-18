# VANTA

A GitHub-ready static gaming portal with a black + neon red/magenta design.

## Run it

No build step is required.

- Open `index.html` directly to preview it.
- Upload the files to a GitHub repository.
- Enable **Settings → Pages → Deploy from branch** and select the `main` branch / root folder.
- Your GitHub Pages URL will then serve the site.

## Included

- Animated startup screen
- Responsive mobile layout
- Home, Games, Proxy, and Settings pages
- Game search, category filters, and Prev/Next pagination through the Lumin catalog
- Per-game fullscreen button, plus a pop-out into a bare `about:blank` window (fullscreen, no VANTA chrome)
- LocalStorage settings
- Reduce-motion option
- Browser leave-confirmation request
- Proxy UI
- Favicon
- No API keys or environment variables

## Scramjet

Scramjet is wired in and ships with the site. Everything it needs client-side lives in this repo
and is served by GitHub Pages:

- `scram/` — Scramjet bundles + wasm rewriter
- `baremux/` — bare-mux transport multiplexer
- `epoxy/` — epoxy transport (TLS in the browser)
- `sw.js` — the service worker that intercepts and rewrites traffic
- `proxy.js` — controller setup and the frame UI
- `config.js` — the Wisp endpoint

### The one thing GitHub Pages cannot do

Scramjet's service worker doesn't talk to the internet directly. It hands requests to a **Wisp
server**, which is a long-lived WebSocket server. Static hosts can't run one, and neither can
Vercel — its functions are serverless and don't accept WebSocket upgrades. Hosts that do work:
Render, Fly.io, Railway, Koyeb, Northflank, or any VPS.

Minimal Wisp server (`server.js`):

```js
import { createServer } from "node:http";
import wisp from "wisp-server-node";

const server = createServer((req, res) => res.end("ok"));
server.on("upgrade", (req, socket, head) => wisp.routeRequest(req, socket, head));
server.listen(process.env.PORT || 3000);
```

`package.json`: `{ "type": "module", "dependencies": { "wisp-server-node": "^1.1.3" }, "scripts": { "start": "node server.js" } }`

Deploy it, then put `wss://<your-host>/` in `config.js` (or in Settings → Proxy, which overrides
the default per browser).

### Deploying `wisp-server/` on Render (free tier)

1. Push this repo to GitHub (the `wisp-server/` folder needs to be in it).
2. On [render.com](https://render.com) → **New → Web Service** → connect the repo.
3. **Root Directory**: `wisp-server`
4. **Runtime**: Node
5. **Build Command**: `npm install`
6. **Start Command**: `npm start`
7. Create the service. Render gives you a URL like `https://vanta-wisp.onrender.com`.
8. In `config.js`, set `window.VANTA_WISP_URL = "wss://vanta-wisp.onrender.com/";` — same host, just `wss://` instead of `https://`.
9. Commit, push, wait for the Pages deploy, then test on the Proxy page.

Free Render instances spin down after ~15 minutes idle and take ~30s to wake back up on
the next request. To soften that, the site now pings the server's plain `https://` URL
the moment VANTA loads (see `wakeHost()` in `proxy.js`) — it's fire-and-forget and doesn't
block the page, so most of that 30s happens in the background before anyone hits GO. It
still won't be instant on a cold start; if that matters, Render's paid tier doesn't sleep.

### Notes

- Service workers require https, so open the Pages URL — not `index.html` from disk.
- The paths adapt automatically whether the site is at `user.github.io/` or `user.github.io/Vanta/`.
- CAPTCHAs on Google/YouTube behave badly from datacenter IPs; that's a property of the Wisp
  host's IP, not of the site.

## LuminSDK
The Games page uses LuminSDK headless mode. The live catalog loads in the browser and each launch requests a fresh playable game URL. No API key or npm install is required.
