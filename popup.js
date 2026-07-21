const DEFAULTS = { enabled: true, brightness: 100, contrast: 100 };

const toggle = document.getElementById("toggle");
const brightness = document.getElementById("brightness");
const contrast = document.getElementById("contrast");
const brightnessValue = document.getElementById("brightnessValue");
const contrastValue = document.getElementById("contrastValue");
const resetBtn = document.getElementById("reset");

function render(settings) {
  toggle.checked = settings.enabled;
  brightness.value = settings.brightness;
  contrast.value = settings.contrast;
  brightnessValue.textContent = `${settings.brightness}%`;
  contrastValue.textContent = `${settings.contrast}%`;
}

function save(partial) {
  chrome.storage.sync.get(DEFAULTS, (current) => {
    const updated = { ...DEFAULTS, ...current, ...partial };
    chrome.storage.sync.set(updated);
    render(updated);
  });
}

chrome.storage.sync.get(DEFAULTS, (stored) => render({ ...DEFAULTS, ...stored }));

toggle.addEventListener("change", () => save({ enabled: toggle.checked }));
brightness.addEventListener("input", () =>
  save({ brightness: Number(brightness.value) })
);
contrast.addEventListener("input", () =>
  save({ contrast: Number(contrast.value) })
);
resetBtn.addEventListener("click", () => save(DEFAULTS));
