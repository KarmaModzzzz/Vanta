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
- Game search and category filters
- LocalStorage settings
- Reduce-motion option
- Browser leave-confirmation request
- Proxy UI
- Favicon
- No API keys or environment variables

## About Scramjet

The included Proxy page is the UI shell only. A real Scramjet deployment needs its proxy/transport backend (commonly Wisp) hosted somewhere that supports the required server workload. GitHub Pages can host the static frontend but cannot run that backend.

The project is intentionally usable immediately as a static website without requiring backend configuration.

## LuminSDK
The Games page uses LuminSDK headless mode. The live catalog loads in the browser and each launch requests a fresh playable game URL. No API key or npm install is required.
