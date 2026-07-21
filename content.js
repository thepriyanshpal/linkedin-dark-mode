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

tagMediaElements(document);

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) tagMediaElements(node);
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
