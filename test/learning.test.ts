import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LearningStore } from "../src/learning.ts";

test("learning history is opt-in, local, and reduced to structured lesson data", () => {
  const directory = mkdtempSync(join(tmpdir(), "omatut-learning-"));
  try {
    const store = new LearningStore(directory);
    const answer = { answer: "Use the theme menu.", steps: ["Open the menu"], shortcut: "SUPER + SHIFT + CTRL + SPACE", targetLabel: "Theme menu", targetX: 10, targetY: 20, confidence: "high" as const, needsMoreContext: false };
    const context = { omarchy: { version: "4", channel: "stable" }, activeWindow: { title: "Desktop", class: "omarchy", workspace: 1 }, pointer: { x: 0, y: 0 }, bindings: [] };
    assert.equal(store.addLesson("How do I change themes?", answer, context), null);
    store.updatePreferences({ historyEnabled: true, onboardingComplete: true, ttsVoice: "marin", ttsSpeed: 4 });
    const lesson = store.addLesson("How do I change themes?", answer, context);
    assert.equal(lesson?.topic, "Theme menu");
    const snapshot = store.snapshot();
    assert.deepEqual(snapshot.stats, { lessons: 1, shortcuts: 1, topics: 1, streak: 1 });
    assert.equal(snapshot.preferences.ttsSpeed, 1.5);
    assert.equal(snapshot.preferences.guideTiming, "adaptive");
    const path = join(directory, "learning.json");
    const persisted = readFileSync(path, "utf8");
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.doesNotMatch(persisted, /targetX|bindings|pointer|screenshot/);
    assert.equal(store.deleteLesson(lesson!.id), true); assert.equal(store.snapshot().stats.lessons, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("legacy learning entries permanently discard Voxtype diagnostics", () => {
  const directory = mkdtempSync(join(tmpdir(), "omatut-learning-"));
  const path = join(directory, "learning.json");
  try {
    writeFileSync(path, JSON.stringify({
      version: 1,
      preferences: { onboardingComplete: true, historyEnabled: true, ttsEnabled: false, ttsVoice: "coral", ttsSpeed: 1 },
      lessons: [{
        id: "lesson-1", createdAt: new Date().toISOString(),
        question: "Loading audio file: voice.wav\nINFO Transcription completed in 1s: \"How do I save a theme?\"\n\nHow do I save a theme?",
        answer: "Copy it into your user themes directory.", steps: [], shortcut: null, topic: "Themes", app: "chromium", workspace: 1,
      }],
    }));
    const snapshot = new LearningStore(directory).snapshot();
    assert.equal(snapshot.lessons[0].question, "How do I save a theme?");
    const migrated = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(migrated.version, 3);
    assert.equal(migrated.lessons[0].question, "How do I save a theme?");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
