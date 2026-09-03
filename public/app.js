const $ = selector => document.querySelector(selector);
const state = { captureId: null, keyConfigured: false, voiceRecording: false, voiceBusy: false, preferences: null, lessons: [] };

const ui = {
  title: $("#view-title"), eyebrow: $("#view-eyebrow"),
  voice: $("#voice-button"), observation: $("#observation-text"), recommendation: $("#recommendation-text"),
  stats: { lessons: $("#stat-lessons"), shortcuts: $("#stat-shortcuts"), topics: $("#stat-topics"), streak: $("#stat-streak") },
  learning: $("#learning-lessons"), clearLearning: $("#clear-learning"),
  onboarding: $("#onboarding-dialog"), onboardingForm: $("#onboarding-form"), onboardingHistory: $("#onboarding-history"), onboardingTts: $("#onboarding-tts"), onboardingVoice: $("#onboarding-voice"), onboardingProvider: $("#onboarding-provider"), onboardingModel: $("#onboarding-model"), onboardingEndpoint: $("#onboarding-endpoint"), onboardingEndpointRow: $("#onboarding-endpoint-row"), onboardingKey: $("#onboarding-api-key"), onboardingKeyRow: $("#onboarding-key-row"), onboardingKeyLabel: $("#onboarding-key-label"), onboardingKeyHelp: $("#onboarding-key-help"), onboardingPreview: $("#onboarding-preview"),
  settings: $("#settings-dialog"), settingsButton: $("#settings-button"), settingsClose: $("#settings-close"), settingsForm: $("#settings-form"), aiProvider: $("#ai-provider"), aiModel: $("#ai-model"), aiEndpoint: $("#ai-endpoint"), aiEndpointRow: $("#ai-endpoint-row"), aiKeyRow: $("#ai-key-row"), aiKeyLabel: $("#ai-key-label"), aiKeyHelp: $("#ai-key-help"), apiKey: $("#api-key"), ttsKeyRow: $("#tts-key-row"), ttsKey: $("#tts-api-key"), historyEnabled: $("#history-enabled"), guideTiming: $("#guide-timing"), ttsEnabled: $("#tts-enabled"), ttsVoice: $("#tts-voice"), ttsSpeed: $("#tts-speed"), settingsPreview: $("#settings-preview"),
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
    state.preferences = home.preferences; state.lessons = home.lessons; updateVoice(); renderHome(home);
    if (!home.preferences.onboardingComplete) { populateOnboarding(home.preferences); ui.onboarding.showModal(); }
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

function renderHome(home) {
  Object.entries(home.stats).forEach(([key, value]) => { if (ui.stats[key]) ui.stats[key].textContent = value; });
  ui.clearLearning.disabled = home.lessons.length === 0;
  renderLessons(ui.learning, home.lessons, true);
  const observation = home.observations?.[0];
  ui.observation.textContent = observation?.observation || "Your first observation arrives after five learnings.";
  ui.recommendation.textContent = observation?.recommendation || "Explore one part of Omarchy and ask OmaTut when you want a hand.";
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
    if (lesson.steps?.length) {
      const steps = document.createElement("ol"); steps.className = "lesson-steps";
      lesson.steps.forEach(step => { const item = document.createElement("li"); item.textContent = step; steps.append(item); });
      article.append(steps);
    }
    if (lesson.shortcut) { const shortcut = document.createElement("kbd"); shortcut.className = "lesson-shortcut"; shortcut.textContent = lesson.shortcut; article.append(shortcut); }
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
  const labels = { home: ["", "Home"], learning: ["", "Learnings"] };
  [ui.eyebrow.textContent, ui.title.textContent] = labels[view] || labels.home;
}

async function toggleVoice() {
  if (!state.keyConfigured) { openSettings(); return; }
  state.voiceBusy = true; updateVoice();
  try {
    const result = await request("/api/voice/toggle", { method: "POST" }); state.voiceRecording = result.state === "listening";
    if (result.answer) await reloadHome();
  } catch (error) { showToast(error.message); }
  finally { state.voiceBusy = false; updateVoice(); }
}

function updateVoice() {
  ui.voice.disabled = state.voiceBusy; ui.voice.classList.toggle("recording", state.voiceRecording);
  ui.voice.innerHTML = state.voiceBusy ? "<span>◌</span> Working…" : state.voiceRecording ? "<span>■</span> Stop & ask" : "<span>●</span> Ask by voice";
}

function openSettings() { if (state.preferences) populateSettings(state.preferences); ui.settings.showModal(); }
function populateSettings(preferences) {
  ui.historyEnabled.checked = preferences.historyEnabled; ui.guideTiming.value = preferences.guideTiming || "adaptive"; ui.ttsEnabled.checked = preferences.ttsEnabled; ui.ttsVoice.value = preferences.ttsVoice; ui.ttsSpeed.value = String(preferences.ttsSpeed);
  ui.aiProvider.value = preferences.aiProvider || "openai"; ui.aiModel.value = preferences.aiModel || providerDefaults(ui.aiProvider.value).model; ui.aiEndpoint.value = preferences.aiBaseUrl || providerDefaults(ui.aiProvider.value).endpoint; updateProviderFields("settings");
}
function populateOnboarding(preferences) {
  ui.onboardingProvider.value = preferences.aiProvider || "openai"; ui.onboardingModel.value = preferences.aiModel || providerDefaults(ui.onboardingProvider.value).model; ui.onboardingEndpoint.value = preferences.aiBaseUrl || providerDefaults(ui.onboardingProvider.value).endpoint; updateProviderFields("onboarding");
}
function providerDefaults(provider) { return provider === "ollama" ? { model: "qwen3-vl:8b", endpoint: "http://127.0.0.1:11434" } : provider === "compatible" ? { model: "", endpoint: "" } : { model: "gpt-5.6-luna", endpoint: "" }; }
function updateProviderFields(scope) {
  const onboarding = scope === "onboarding"; const provider = (onboarding ? ui.onboardingProvider : ui.aiProvider).value; const endpointRow = onboarding ? ui.onboardingEndpointRow : ui.aiEndpointRow; const keyRow = onboarding ? ui.onboardingKeyRow : ui.aiKeyRow; const keyLabel = onboarding ? ui.onboardingKeyLabel : ui.aiKeyLabel; const keyHelp = onboarding ? ui.onboardingKeyHelp : ui.aiKeyHelp;
  endpointRow.classList.toggle("hidden", provider === "openai"); keyRow.classList.toggle("hidden", provider === "ollama"); if (!onboarding) ui.ttsKeyRow.classList.toggle("hidden", provider === "openai");
  keyLabel.textContent = provider === "compatible" ? "API key" : "OpenAI API key"; keyHelp.textContent = provider === "compatible" ? "Stored securely in Secret Service." : "Stored securely in Secret Service.";
}

async function saveKey(input, provider) {
  if (!input.value.trim()) return;
  await request("/api/settings/provider-key", { method: "PUT", body: JSON.stringify({ provider, key: input.value }) }); state.keyConfigured = true; input.value = "";
}

async function previewVoice(voice, speed, keyInput, button) {
  setBusy(button, true, "Playing…");
  try { await saveKey(keyInput, "openai"); await request("/api/speech/preview", { method: "POST", body: JSON.stringify({ voice: voice.value, speed: Number(speed?.value || 1) }) }); }
  catch (error) { showToast(error.message); }
  finally { setBusy(button, false, "Preview"); }
}

ui.onboardingForm.addEventListener("submit", async event => {
  event.preventDefault(); const button = event.submitter; setBusy(button, true, "Setting things up…");
  try { const provider = ui.onboardingProvider.value; await saveKey(ui.onboardingKey, provider); await request("/api/onboarding", { method: "POST", body: JSON.stringify({ historyEnabled: ui.onboardingHistory.checked, ttsEnabled: ui.onboardingTts.checked, ttsVoice: ui.onboardingVoice.value, ttsSpeed: 1, aiProvider: provider, aiModel: ui.onboardingModel.value, aiBaseUrl: ui.onboardingEndpoint.value }) }); if (provider !== "ollama" && !state.keyConfigured) throw new Error("Add an API key to continue."); ui.onboarding.close(); await reloadHome(); showToast("OmaTut is ready. Press Super + Shift + T anytime."); }
  catch (error) { showToast(error.message); }
  finally { setBusy(button, false, "Start learning"); }
});

ui.settingsForm.addEventListener("submit", async event => {
  event.preventDefault(); const button = event.submitter; setBusy(button, true, "Saving…");
  try { const provider = ui.aiProvider.value; await saveKey(ui.apiKey, provider); if (provider !== "openai") await saveKey(ui.ttsKey, "openai"); await request("/api/preferences", { method: "PUT", body: JSON.stringify({ historyEnabled: ui.historyEnabled.checked, guideTiming: ui.guideTiming.value, ttsEnabled: ui.ttsEnabled.checked, ttsVoice: ui.ttsVoice.value, ttsSpeed: Number(ui.ttsSpeed.value), aiProvider: provider, aiModel: ui.aiModel.value, aiBaseUrl: ui.aiEndpoint.value }) }); ui.settings.close(); await reloadHome(); showToast("Settings saved."); }
  catch (error) { showToast(error.message); }
  finally { setBusy(button, false, "Save settings"); }
});

document.querySelectorAll("[data-view-target]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.viewTarget)));
ui.voice.addEventListener("click", toggleVoice);
ui.settingsButton.addEventListener("click", openSettings); ui.settingsClose.addEventListener("click", () => ui.settings.close());
ui.onboardingPreview.addEventListener("click", () => previewVoice(ui.onboardingVoice, null, ui.onboardingKey, ui.onboardingPreview));
ui.settingsPreview.addEventListener("click", () => previewVoice(ui.ttsVoice, ui.ttsSpeed, ui.aiProvider.value === "openai" ? ui.apiKey : ui.ttsKey, ui.settingsPreview));
ui.onboardingProvider.addEventListener("change", () => updateProviderFields("onboarding")); ui.aiProvider.addEventListener("change", () => updateProviderFields("settings"));
ui.learning.addEventListener("click", async event => { const button = event.target.closest("[data-lesson-id]"); if (!button) return; await request(`/api/learning/${encodeURIComponent(button.dataset.lessonId)}`, { method: "DELETE" }); await reloadHome(); });
ui.clearLearning.addEventListener("click", async () => { if (!confirm("Clear all saved learning notes? This cannot be undone.")) return; await request("/api/learning", { method: "DELETE" }); await reloadHome(); });

function setBusy(button, busy, label) { if (!button) return; button.disabled = busy; button.textContent = label; }
function relativeTime(value) { const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000); if (days <= 0) return "Today"; if (days === 1) return "Yesterday"; if (days < 7) return `${days} days ago`; return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function capitalize(value) { return value ? value[0].toUpperCase() + value.slice(1) : ""; }
let toastTimer; function showToast(message) { clearTimeout(toastTimer); ui.toast.textContent = message; ui.toast.classList.remove("hidden"); toastTimer = setTimeout(() => ui.toast.classList.add("hidden"), 5000); }

const events = new EventSource("/api/theme/events"); events.onmessage = event => { if (event.data === "changed") $("#omarchy-theme").href = `/omarchy-theme.css?t=${Date.now()}`; };
const learningEvents = new EventSource("/api/learning/events"); learningEvents.onmessage = event => { if (event.data === "updated") reloadHomeFromLiveUpdate(); };
loadApp();
