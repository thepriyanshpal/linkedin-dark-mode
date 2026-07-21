# LinkedIn Dark Mode

A tiny, zero-dependency browser extension that forces a dark theme onto
LinkedIn, with a popup to toggle it on/off and tweak brightness/contrast.

## How it works

LinkedIn's CSS class names are auto-generated and change often, so
hand-written selector overrides break within days. Instead this extension
uses the "smart invert" trick:

1. Invert + hue-rotate the **entire page** — light backgrounds become dark
   and dark text becomes light.
2. Invert + hue-rotate a **second time** on anything that's actually a
   photo, video, icon, or background-image (profile pictures, banners,
   logos) — the double invert cancels out, so real imagery keeps its true
   colors.

A small `MutationObserver` in `content.js` keeps tagging newly-loaded
avatar/banner elements (LinkedIn lazy-loads these as you scroll) so they
stay correctly un-inverted.

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (toggle, top right).
3. Click **Load unpacked**.
4. Select this `linkedin-dark-mode` folder.
5. Open or refresh linkedin.com — it should now be dark.

Click the extension's toolbar icon at any time to disable it or adjust
brightness/contrast; changes apply instantly to any open LinkedIn tabs.

## Files

- `manifest.json` — MV3 extension manifest, scoped to `*.linkedin.com`.
- `content.css` / `content.js` — the actual dark-mode logic, injected into
  LinkedIn pages.
- `popup.html` / `popup.css` / `popup.js` — the toolbar popup UI for
  toggling and adjusting the theme.

## Notes

- Settings are stored via `chrome.storage.sync`, so they follow you across
  signed-in Chrome profiles.
- This only runs on `linkedin.com` — it has no effect on any other site.
