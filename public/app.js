const $ = selector => document.querySelector(selector);
const state = { captureId: null, keyConfigured: false, voiceRecording: false, voiceBusy: false, preferences: null, lessons: [] };

const ui = {
  title: $("#view-title"), eyebrow: $("#view-eyebrow"),
  version: $("#version"), window: $("#window"), bindingCount: $("#binding-count"), voice: $("#voice-button"),
  stats: { lessons: $("#stat-lessons"), shortcuts: $("#stat-shortcuts"), topics: $("#stat-topics"), streak: $("#stat-streak") },
  learning: $("#learning-lessons"), clearLearning: $("#clear-learning"),
  emptyCapture: $("#empty-capture"), preview: $("#capture-preview"), image: $("#capture-image"),
  capture: $("#capture-button"), recapture: $("#recapture-button"), question: $("#question"), ask: $("#ask-button"), form: $("#ask-form"),
  answerCard: $("#answer-card"), answerText: $("#answer-text"), steps: $("#steps"), shortcutCard: $("#shortcut-card"), keycaps: $("#keycaps"), confidence: $("#confidence"),
  onboarding: $("#onboarding-dialog"), onboardingForm: $("#onboarding-form"), onboardingHistory: $("#onboarding-history"), onboardingTts: $("#onboarding-tts"), onboardingVoice: $("#onboarding-voice"), onboardingKey: $("#onboarding-api-key"), onboardingKeyRow: $("#onboarding-key-row"), onboardingPreview: $("#onboarding-preview"),
  settings: $("#settings-dialog"), settingsButton: $("#settings-button"), settingsClose: $("#settings-close"), settingsForm: $("#settings-form"), apiKey: $("#api-key"), historyEnabled: $("#history-enabled"), guideTiming: $("#guide-timing"), ttsEnabled: $("#tts-enabled"), ttsVoice: $("#tts-voice"), ttsSpeed: $("#tts-speed"), settingsPreview: $("#settings-preview"),
  toast: $("#toast"),
};

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

async function loadApp() {
  try {
    const [status, home] = await Promise.all([request("/api/status"), request("/api/home")]);
    state.keyConfigured = status.keyConfigured; state.voiceRecording = Boolean(status.voice?.recording); state.voiceBusy = Boolean(status.voice?.busy);
    state.preferences = home.preferences; state.lessons = home.lessons; updateVoice(); updateContext(status); renderHome(home);
    if (!home.preferences.onboardingComplete) {
      ui.onboardingKeyRow.classList.toggle("hidden", state.keyConfigured); ui.onboarding.showModal();
    }
  } catch (error) { showToast(error.message); }
}

async function reloadHome() {
  const home = await request("/api/home"); state.preferences = home.preferences; state.lessons = home.lessons; renderHome(home);
}

let liveRefreshQueued = false;
function reloadHomeFromLiveUpdate() {
  if (liveRefreshQueued) return;
  liveRefreshQueued = true;
  queueMicrotask(async () => {
    try { await reloadHome(); }
    catch (error) { console.warn("Could not refresh OmaTut learning:", error); }
    finally { liveRefreshQueued = false; }
  });
}

function updateContext(status) {
  const context = status.context;
  ui.version.textContent = [context.omarchy.version && `Omarchy ${context.omarchy.version}`, context.omarchy.channel].filter(Boolean).join(" · ") || "Omarchy";
  ui.window.textContent = context.activeWindow.title ? `${context.activeWindow.title}${context.activeWindow.workspace != null ? ` · workspace ${context.activeWindow.workspace}` : ""}` : "Desktop context available";
  ui.bindingCount.textContent = `${context.bindings.length} bindings indexed`;
}

function renderHome(home) {
  Object.entries(home.stats).forEach(([key, value]) => { if (ui.stats[key]) ui.stats[key].textContent = value; });
  ui.clearLearning.disabled = home.lessons.length === 0;
  renderLessons(ui.learning, home.lessons, true);
  populateSettings(home.preferences);
}

function renderLessons(container, lessons, deletable) {
  container.replaceChildren();
  if (!lessons.length) {
    const empty = document.createElement("div"); empty.className = "empty-state";
    empty.textContent = state.preferences?.historyEnabled === false ? "Your journal is paused." : "Your first useful discovery will appear here.";
    container.append(empty); return;
  }
  lessons.forEach(lesson => {
    const article = document.createElement("article"); article.className = "lesson-item";
    const question = document.createElement("h3"); question.textContent = lesson.question;
    const answer = document.createElement("p"); answer.textContent = lesson.answer;
    if (!deletable) {
      const meta = document.createElement("div"); meta.className = "lesson-meta";
      const topic = document.createElement("span"); topic.textContent = lesson.topic;
      const time = document.createElement("time"); time.dateTime = lesson.createdAt; time.textContent = relativeTime(lesson.createdAt);
      meta.append(topic, time); article.append(meta);
    }
    article.append(question, answer);
    if (!deletable && lesson.shortcut) { const shortcut = document.createElement("kbd"); shortcut.className = "lesson-shortcut"; shortcut.textContent = lesson.shortcut; article.append(shortcut); }
    if (deletable) {
      const details = document.createElement("div"); details.className = "lesson-details";
      const remove = document.createElement("button"); remove.className = "delete-lesson"; remove.type = "button"; remove.dataset.lessonId = lesson.id; remove.textContent = "Remove"; details.append(remove); article.append(details);
    }
    container.append(article);
  });
}

function navigate(view) {
  document.querySelectorAll("[data-view]").forEach(section => section.classList.toggle("active", section.dataset.view === view));
  document.querySelectorAll("[data-view-target]").forEach(button => button.classList.toggle("active", button.dataset.viewTarget === view));
  const labels = { home: ["", "Home"], ask: ["", "Ask OmaTut"], learning: ["", "Learnings"] };
  [ui.eyebrow.textContent, ui.title.textContent] = labels[view] || labels.home;
}

async function toggleVoice() {
  if (!state.keyConfigured) { openSettings(); return; }
  state.voiceBusy = true; updateVoice();
  try {
    const result = await request("/api/voice/toggle", { method: "POST" }); state.voiceRecording = result.state === "listening";
    if (state.voiceRecording) navigate("ask");
    if (result.question) { ui.question.value = result.question; updateAsk(); }
    if (result.answer) { renderAnswer(result.answer); navigate("ask"); await reloadHome(); }
  } catch (error) { showToast(error.message); }
  finally { state.voiceBusy = false; updateVoice(); }
}

function updateVoice() {
  ui.voice.disabled = state.voiceBusy; ui.voice.classList.toggle("recording", state.voiceRecording);
  ui.voice.innerHTML = state.voiceBusy ? "<span>◌</span> Working…" : state.voiceRecording ? "<span>■</span> Stop & ask" : "<span>●</span> Ask by voice";
}

async function takeCapture() {
  setBusy(ui.capture, true, "Select an area…"); setBusy(ui.recapture, true, "Selecting…");
  try { const capture = await request("/api/capture", { method: "POST" }); state.captureId = capture.id; ui.image.src = `/api/capture/${capture.id}?t=${Date.now()}`; ui.emptyCapture.classList.add("hidden"); ui.preview.classList.remove("hidden"); updateAsk(); ui.question.focus(); }
  catch (error) { showToast(error.message); }
  finally { setBusy(ui.capture, false, "Select an area"); setBusy(ui.recapture, false, "Choose again"); }
}

function updateAsk() { ui.ask.disabled = !state.captureId || !ui.question.value.trim(); }

function renderAnswer(answer) {
  ui.answerText.textContent = answer.answer; ui.steps.replaceChildren();
  answer.steps.forEach(step => { const item = document.createElement("li"); item.textContent = step; ui.steps.append(item); });
  ui.keycaps.replaceChildren();
  if (answer.shortcut) {
    answer.shortcut.split(/\s*\+\s*/).filter(Boolean).forEach((key, index) => { if (index) { const plus = document.createElement("span"); plus.className = "plus"; plus.textContent = "+"; ui.keycaps.append(plus); } const cap = document.createElement("kbd"); cap.textContent = key; ui.keycaps.append(cap); });
    ui.shortcutCard.classList.remove("hidden");
  } else ui.shortcutCard.classList.add("hidden");
  ui.confidence.textContent = `${capitalize(answer.confidence)} confidence${answer.targetLabel ? ` · pointing to ${answer.targetLabel}` : ""}${answer.needsMoreContext ? " · select a wider region if needed" : ""}`;
  ui.answerCard.classList.remove("hidden"); ui.answerCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openSettings() { if (state.preferences) populateSettings(state.preferences); ui.settings.showModal(); }
function populateSettings(preferences) { ui.historyEnabled.checked = preferences.historyEnabled; ui.guideTiming.value = preferences.guideTiming || "adaptive"; ui.ttsEnabled.checked = preferences.ttsEnabled; ui.ttsVoice.value = preferences.ttsVoice; ui.ttsSpeed.value = String(preferences.ttsSpeed); }

async function saveKey(input) {
  if (!input.value.trim()) return;
  await request("/api/settings/openai-key", { method: "PUT", body: JSON.stringify({ key: input.value }) }); state.keyConfigured = true; input.value = "";
}

async function previewVoice(voice, speed, keyInput, button) {
  setBusy(button, true, "Playing…");
  try { await saveKey(keyInput); if (!state.keyConfigured) throw new Error("Add an OpenAI API key first."); await request("/api/speech/preview", { method: "POST", body: JSON.stringify({ voice: voice.value, speed: Number(speed?.value || 1) }) }); }
  catch (error) { showToast(error.message); }
  finally { setBusy(button, false, "Preview"); }
}

ui.onboardingForm.addEventListener("submit", async event => {
  event.preventDefault(); const button = event.submitter; setBusy(button, true, "Setting things up…");
  try { await saveKey(ui.onboardingKey); if (!state.keyConfigured) throw new Error("Add an OpenAI API key to continue."); await request("/api/onboarding", { method: "POST", body: JSON.stringify({ historyEnabled: ui.onboardingHistory.checked, ttsEnabled: ui.onboardingTts.checked, ttsVoice: ui.onboardingVoice.value, ttsSpeed: 1 }) }); ui.onboarding.close(); await reloadHome(); showToast("OmaTut is ready. Press Super + Shift + T anytime."); }
  catch (error) { showToast(error.message); }
  finally { setBusy(button, false, "Start learning"); }
});

ui.settingsForm.addEventListener("submit", async event => {
  event.preventDefault(); const button = event.submitter; setBusy(button, true, "Saving…");
  try { await saveKey(ui.apiKey); await request("/api/preferences", { method: "PUT", body: JSON.stringify({ historyEnabled: ui.historyEnabled.checked, guideTiming: ui.guideTiming.value, ttsEnabled: ui.ttsEnabled.checked, ttsVoice: ui.ttsVoice.value, ttsSpeed: Number(ui.ttsSpeed.value) }) }); ui.settings.close(); await reloadHome(); showToast("Settings saved."); }
  catch (error) { showToast(error.message); }
  finally { setBusy(button, false, "Save settings"); }
});

ui.form.addEventListener("submit", async event => {
  event.preventDefault(); if (!state.captureId) return; if (!state.keyConfigured) { openSettings(); return; }
  setBusy(ui.ask, true, "◌");
  try { const result = await request("/api/ask", { method: "POST", body: JSON.stringify({ captureId: state.captureId, question: ui.question.value }) }); renderAnswer(result.answer); await reloadHome(); }
  catch (error) { showToast(error.message); }
  finally { setBusy(ui.ask, false, "↗"); updateAsk(); }
});

document.querySelectorAll("[data-view-target]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.viewTarget)));
document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));
document.querySelectorAll("[data-question]").forEach(button => button.addEventListener("click", () => { ui.question.value = button.dataset.question; updateAsk(); ui.question.focus(); }));
ui.capture.addEventListener("click", takeCapture); ui.recapture.addEventListener("click", takeCapture); ui.voice.addEventListener("click", toggleVoice); ui.question.addEventListener("input", updateAsk);
ui.settingsButton.addEventListener("click", openSettings); ui.settingsClose.addEventListener("click", () => ui.settings.close());
ui.onboardingPreview.addEventListener("click", () => previewVoice(ui.onboardingVoice, null, ui.onboardingKey, ui.onboardingPreview));
ui.settingsPreview.addEventListener("click", () => previewVoice(ui.ttsVoice, ui.ttsSpeed, ui.apiKey, ui.settingsPreview));
ui.learning.addEventListener("click", async event => { const button = event.target.closest("[data-lesson-id]"); if (!button) return; await request(`/api/learning/${encodeURIComponent(button.dataset.lessonId)}`, { method: "DELETE" }); await reloadHome(); });
ui.clearLearning.addEventListener("click", async () => { if (!confirm("Clear all saved learning notes? This cannot be undone.")) return; await request("/api/learning", { method: "DELETE" }); await reloadHome(); });

function setBusy(button, busy, label) { if (!button) return; button.disabled = busy; button.textContent = label; }
function relativeTime(value) { const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000); if (days <= 0) return "Today"; if (days === 1) return "Yesterday"; if (days < 7) return `${days} days ago`; return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function capitalize(value) { return value ? value[0].toUpperCase() + value.slice(1) : ""; }
let toastTimer; function showToast(message) { clearTimeout(toastTimer); ui.toast.textContent = message; ui.toast.classList.remove("hidden"); toastTimer = setTimeout(() => ui.toast.classList.add("hidden"), 5000); }

const events = new EventSource("/api/theme/events"); events.onmessage = event => { if (event.data === "changed") $("#omarchy-theme").href = `/omarchy-theme.css?t=${Date.now()}`; };
const learningEvents = new EventSource("/api/learning/events"); learningEvents.onmessage = event => { if (event.data === "updated") reloadHomeFromLiveUpdate(); };
loadApp();
