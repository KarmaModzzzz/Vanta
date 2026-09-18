// VANTA proxy configuration
//
// The Wisp server is the only piece that cannot live on GitHub Pages.
// Point this at a host that supports long-lived WebSocket connections
// (Render, Fly.io, Railway, Koyeb, a VPS, ...). It must be wss:// because
// the site itself is served over https.
//
// Users can override this per-browser on the Settings page.
window.VANTA_WISP_URL = "wss://vanta-jarz.onrender.com/";
