import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
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
    const path = join(directory, "learning.json");
    const persisted = readFileSync(path, "utf8");
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.doesNotMatch(persisted, /targetX|bindings|pointer|screenshot/);
    assert.equal(store.deleteLesson(lesson!.id), true); assert.equal(store.snapshot().stats.lessons, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
