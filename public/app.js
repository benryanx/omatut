const $ = selector => document.querySelector(selector);
const state = { captureId: null, keyConfigured: false, voiceRecording: false, voiceBusy: false };

const ui = {
  version: $("#version"), window: $("#window"), bindingCount: $("#binding-count"), overlayState: $("#overlay-state"),
  voice: $("#voice-button"),
  emptyCapture: $("#empty-capture"), preview: $("#capture-preview"), image: $("#capture-image"),
  capture: $("#capture-button"), recapture: $("#recapture-button"), question: $("#question"), ask: $("#ask-button"),
  form: $("#ask-form"), answerCard: $("#answer-card"), answerText: $("#answer-text"), steps: $("#steps"),
  shortcutCard: $("#shortcut-card"), keycaps: $("#keycaps"), confidence: $("#confidence"),
  settings: $("#settings-dialog"), settingsButton: $("#settings-button"), settingsClose: $("#settings-close"), settingsForm: $("#settings-form"), apiKey: $("#api-key"), toast: $("#toast"),
};

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

async function loadStatus() {
  try {
    const status = await request("/api/status"); state.keyConfigured = status.keyConfigured;
    state.voiceRecording = Boolean(status.voice?.recording); state.voiceBusy = Boolean(status.voice?.busy); updateVoice();
    ui.overlayState.textContent = status.overlayConnected ? "On-screen guide ready" : "Companion mode";
    ui.overlayState.closest(".local-badge").classList.toggle("offline", !status.overlayConnected);
    const context = status.context;
    ui.version.textContent = [context.omarchy.version && `Omarchy ${context.omarchy.version}`, context.omarchy.channel].filter(Boolean).join(" · ") || "Omarchy";
    ui.window.textContent = context.activeWindow.title ? `${context.activeWindow.title}${context.activeWindow.workspace != null ? ` · workspace ${context.activeWindow.workspace}` : ""}` : "Desktop context available";
    ui.bindingCount.textContent = `${context.bindings.length} bindings indexed`;
  } catch (error) { showToast(error.message); }
}

async function toggleVoice() {
  if (!state.keyConfigured) { ui.settings.showModal(); return; }
  state.voiceBusy = true; updateVoice();
  try {
    const result = await request("/api/voice/toggle", { method: "POST" });
    state.voiceRecording = result.state === "listening";
    if (result.answer) { renderAnswer(result.answer); ui.answerCard.scrollIntoView({ behavior: "smooth", block: "start" }); }
  } catch (error) { showToast(error.message); await loadStatus(); }
  finally { state.voiceBusy = false; updateVoice(); }
}

function updateVoice() {
  ui.voice.disabled = state.voiceBusy;
  ui.voice.classList.toggle("recording", state.voiceRecording);
  ui.voice.innerHTML = state.voiceBusy ? "<span>◌</span> Working…" : state.voiceRecording ? "<span>■</span> Stop & ask" : "<span>●</span> Ask by voice";
}

async function takeCapture() {
  setBusy(ui.capture, true, "Select a region…"); setBusy(ui.recapture, true, "Selecting…");
  try {
    const capture = await request("/api/capture", { method: "POST" });
    state.captureId = capture.id; ui.image.src = `/api/capture/${capture.id}?t=${Date.now()}`;
    ui.emptyCapture.classList.add("hidden"); ui.preview.classList.remove("hidden"); updateAsk(); ui.question.focus();
  } catch (error) { showToast(error.message); }
  finally { setBusy(ui.capture, false, "See my screen"); setBusy(ui.recapture, false, "Choose again"); }
}

function updateAsk() { ui.ask.disabled = !state.captureId || !ui.question.value.trim(); }

ui.capture.addEventListener("click", takeCapture); ui.recapture.addEventListener("click", takeCapture);
ui.voice.addEventListener("click", toggleVoice);
ui.question.addEventListener("input", updateAsk);
document.querySelectorAll("[data-question]").forEach(button => button.addEventListener("click", () => { ui.question.value = button.dataset.question; updateAsk(); ui.question.focus(); }));
ui.settingsButton.addEventListener("click", () => ui.settings.showModal());
ui.settingsClose.addEventListener("click", () => ui.settings.close());

ui.settingsForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await request("/api/settings/openai-key", { method: "PUT", body: JSON.stringify({ key: ui.apiKey.value }) });
    state.keyConfigured = true; ui.apiKey.value = ""; ui.settings.close(); showToast("OpenAI key saved in your desktop keyring.");
  } catch (error) { showToast(error.message); }
});

ui.form.addEventListener("submit", async event => {
  event.preventDefault(); if (!state.captureId) return;
  if (!state.keyConfigured) { ui.settings.showModal(); return; }
  setBusy(ui.ask, true, "OmaTut is looking…");
  try {
    const result = await request("/api/ask", { method: "POST", body: JSON.stringify({ captureId: state.captureId, question: ui.question.value }) });
    renderAnswer(result.answer); ui.answerCard.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { showToast(error.message); }
  finally { setBusy(ui.ask, false, "Ask OmaTut ↗"); updateAsk(); }
});

function renderAnswer(answer) {
  ui.answerText.textContent = answer.answer; ui.steps.replaceChildren();
  answer.steps.forEach(step => { const li = document.createElement("li"); li.textContent = step; ui.steps.append(li); });
  ui.keycaps.replaceChildren();
  if (answer.shortcut) {
    const keys = answer.shortcut.split(/\s*\+\s*/).filter(Boolean);
    keys.forEach((key, index) => {
      if (index) { const plus = document.createElement("span"); plus.className = "plus"; plus.textContent = "+"; ui.keycaps.append(plus); }
      const cap = document.createElement("kbd"); cap.textContent = key; ui.keycaps.append(cap);
    });
    ui.shortcutCard.classList.remove("hidden");
  } else ui.shortcutCard.classList.add("hidden");
  ui.confidence.textContent = `${capitalize(answer.confidence)} confidence${answer.targetLabel ? ` · pointing to ${answer.targetLabel}` : ""}${answer.needsMoreContext ? " · select a wider region if this doesn’t match what you meant" : ""}`;
  ui.answerCard.classList.remove("hidden");
}

function setBusy(button, busy, label) { button.disabled = busy; button.textContent = label; }
let toastTimer;
function showToast(message) { clearTimeout(toastTimer); ui.toast.textContent = message; ui.toast.classList.remove("hidden"); toastTimer = setTimeout(() => ui.toast.classList.add("hidden"), 5000); }
function capitalize(value) { return value ? value[0].toUpperCase() + value.slice(1) : ""; }

const events = new EventSource("/api/theme/events");
events.onmessage = event => { if (event.data === "changed") $("#omarchy-theme").href = `/omarchy-theme.css?t=${Date.now()}`; };
loadStatus();
