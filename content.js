// Applies the dark-mode class/variables to <html> as early as possible
// (document_start) so there's no flash of the normal light page.

const DEFAULTS = { enabled: true, brightness: 100, contrast: 100 };

function applySettings(settings) {
  const html = document.documentElement;
  if (!html) return;

  html.classList.add("lidm-dark-transition");
  html.classList.toggle("lidm-dark-enabled", settings.enabled);
  html.style.setProperty("--lidm-brightness", settings.brightness / 100);
  html.style.setProperty("--lidm-contrast", settings.contrast / 100);
}

function loadAndApply() {
  chrome.storage.sync.get(DEFAULTS, (stored) => {
    applySettings({ ...DEFAULTS, ...stored });
  });
}

loadAndApply();

// Keep in sync if the user tweaks settings from the popup while the
// page is already open.
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "sync") loadAndApply();
});

// LinkedIn is a single-page app that lazily loads background-image
// avatars/banners on scroll; tag freshly-added elements that use inline
// background-image so content.css's un-invert rule keeps catching them.
const tagMediaElements = (root) => {
  root.querySelectorAll?.('[style*="background-image"]').forEach((el) => {
    el.setAttribute("data-lidm-media", "");
  });
};

// --- Smarter handling for large images/canvases (e.g. LinkedIn "document"
// carousel posts, which render each PDF slide as a big image/canvas) ---
//
// By default we keep real photos/logos in their true colors, which is
// correct for avatars, company logos, etc. But a big, predominantly-white
// slide/table graphic left in its original colors looks like a jarring
// bright hole punched into an otherwise dark page. The established
// pattern for this (used by Dark Reader, the most widely used universal
// dark-mode extension) is: sample the image's average lightness, and if
// it's large *and* predominantly light, let it invert along with the rest
// of the page instead of preserving its true colors -- turning a bright
// white slide/table dark like everything else, while leaving actual
// photos (usually darker/more colorful on average) untouched.
const LARGE_MIN_DIMENSION = 180;
const LIGHT_LUMINANCE_THRESHOLD = 0.72;
const MIN_OPAQUE_RATIO = 0.7;

let sampleCanvas = null;
let sampleCtx = null;
function getSampleContext() {
  if (!sampleCtx) {
    sampleCanvas = document.createElement("canvas");
    sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  }
  return sampleCtx;
}

function relativeLuminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Returns average lightness (0-1) of the visible/opaque pixels, or null if
// it can't be determined (too transparent to tell, or a cross-origin
// "tainted" canvas that we're not allowed to read pixels from -- LinkedIn
// serves most media from a separate CDN origin, so this is common and we
// just safely fall back to leaving the element's true colors alone).
function sampleLightness(source, sw, sh) {
  const ctx = getSampleContext();
  if (!ctx) return null;
  const SAMPLE = 24;
  const scale = Math.min(1, SAMPLE / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  sampleCanvas.width = w;
  sampleCanvas.height = h;
  ctx.clearRect(0, 0, w, h);
  try {
    ctx.drawImage(source, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let totalLum = 0;
    let opaqueCount = 0;
    const pixelCount = w * h;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] / 255 < 0.2) continue;
      opaqueCount++;
      totalLum += relativeLuminance(data[i], data[i + 1], data[i + 2]);
    }
    if (pixelCount === 0 || opaqueCount / pixelCount < MIN_OPAQUE_RATIO) return null;
    return totalLum / opaqueCount;
  } catch {
    return null; // tainted canvas -- can't read pixels, stay safe.
  }
}

function classifyMediaBrightness(el, sw, sh) {
  if (!sw || !sh) return;
  if (sw < LARGE_MIN_DIMENSION && sh < LARGE_MIN_DIMENSION) return; // icon/avatar-sized, leave true-color
  const lightness = sampleLightness(el, sw, sh);
  if (lightness === null) return;
  if (lightness >= LIGHT_LUMINANCE_THRESHOLD) {
    el.setAttribute("data-lidm-invert-with-page", "");
  } else {
    el.removeAttribute("data-lidm-invert-with-page");
  }
}

function classifyImage(img) {
  const run = () => classifyMediaBrightness(img, img.naturalWidth, img.naturalHeight);
  if (img.complete && img.naturalWidth) run();
  img.addEventListener("load", run);
}

function classifyCanvas(canvas) {
  // Canvas content (e.g. LinkedIn's document/slide viewer) tends to paint
  // asynchronously right after insertion, so give it a moment before
  // sampling.
  window.setTimeout(
    () => classifyMediaBrightness(canvas, canvas.width, canvas.height),
    250
  );
}

const scanMedia = (root) => {
  if (!root.querySelectorAll) return;
  root.querySelectorAll("img").forEach(classifyImage);
  root.querySelectorAll("canvas").forEach(classifyCanvas);
};

tagMediaElements(document);
scanMedia(document);

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        tagMediaElements(node);
        scanMedia(node);
        if (node.tagName === "IMG") classifyImage(node);
        if (node.tagName === "CANVAS") classifyCanvas(node);
      }
    });
  }
});

const startObserving = () => {
  observer.observe(document.documentElement, { childList: true, subtree: true });
};

if (document.body) {
  startObserving();
} else {
  document.addEventListener("DOMContentLoaded", startObserving, { once: true });
}

// LinkedIn's document/slide viewer can redraw the *same* <canvas> element
// (e.g. paging through a carousel) without it being re-inserted into the
// DOM, so the mutation observer above wouldn't catch that. Periodically
// re-sample visible canvases to stay accurate; this is cheap since a
// typical page only has a handful of canvases at once.
window.setInterval(() => {
  document.querySelectorAll("canvas").forEach(classifyCanvas);
}, 2000);
