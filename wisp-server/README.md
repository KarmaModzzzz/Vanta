# VANTA Wisp server

The transport backend for Scramjet. The static site on GitHub Pages connects here over `wss://`.

## Render
1. New → Web Service → point at this repo, root directory `wisp-server`
2. Build: `npm install` — Start: `npm start`
3. Copy the service URL and set `window.VANTA_WISP_URL = "wss://<service>.onrender.com/"` in `../config.js`

Free Render instances sleep when idle; the first request after a nap takes ~30s to wake.

## Local
`npm install && npm start`, then use `ws://localhost:3000/` in Settings.
