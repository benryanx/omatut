import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { DesktopContext } from "./omarchy.ts";
import type { TutorAnswer } from "./tutor.ts";
import { extractTranscriptText } from "./vocabulary.ts";

export const TTS_VOICES = ["coral", "marin", "cedar", "sage", "alloy", "ash", "ballad", "echo", "fable", "nova", "onyx", "shimmer", "verse"] as const;
export type TtsVoice = typeof TTS_VOICES[number];
export const GUIDE_TIMINGS = ["adaptive", "brief", "relaxed", "persistent"] as const;
export type GuideTiming = typeof GUIDE_TIMINGS[number];

export interface Preferences {
  onboardingComplete: boolean;
  historyEnabled: boolean;
  ttsEnabled: boolean;
  ttsVoice: TtsVoice;
  ttsSpeed: number;
  guideTiming: GuideTiming;
}

export interface Lesson {
  id: string;
  createdAt: string;
  question: string;
  answer: string;
  steps: string[];
  shortcut: string | null;
  topic: string;
  app: string | null;
  workspace: string | number | null;
}

interface LearningData {
  version: 2;
  preferences: Preferences;
  lessons: Lesson[];
}

export interface LearningStats {
  lessons: number;
  shortcuts: number;
  topics: number;
  streak: number;
}

const defaults: LearningData = {
  version: 2,
  preferences: { onboardingComplete: false, historyEnabled: false, ttsEnabled: false, ttsVoice: "coral", ttsSpeed: 1, guideTiming: "adaptive" },
  lessons: [],
};

export class LearningStore {
  private readonly path: string;

  constructor(directory = process.env.OMATUT_STATE_DIR || join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "omatut")) {
    this.path = join(directory, "learning.json");
  }

  snapshot(): { preferences: Preferences; lessons: Lesson[]; stats: LearningStats } {
    const data = this.read();
    return { preferences: { ...data.preferences }, lessons: data.lessons.map(copyLesson), stats: calculateStats(data.lessons) };
  }

  updatePreferences(input: Partial<Preferences>): Preferences {
    const data = this.read();
    const next: Preferences = {
      ...data.preferences,
      ...(typeof input.onboardingComplete === "boolean" ? { onboardingComplete: input.onboardingComplete } : {}),
      ...(typeof input.historyEnabled === "boolean" ? { historyEnabled: input.historyEnabled } : {}),
      ...(typeof input.ttsEnabled === "boolean" ? { ttsEnabled: input.ttsEnabled } : {}),
      ...(typeof input.ttsVoice === "string" && TTS_VOICES.includes(input.ttsVoice as TtsVoice) ? { ttsVoice: input.ttsVoice as TtsVoice } : {}),
      ...(typeof input.ttsSpeed === "number" && Number.isFinite(input.ttsSpeed) ? { ttsSpeed: Math.max(0.75, Math.min(1.5, input.ttsSpeed)) } : {}),
      ...(typeof input.guideTiming === "string" && GUIDE_TIMINGS.includes(input.guideTiming as GuideTiming) ? { guideTiming: input.guideTiming as GuideTiming } : {}),
    };
    data.preferences = next; this.write(data); return { ...next };
  }

  addLesson(question: string, answer: TutorAnswer, context: DesktopContext): Lesson | null {
    const data = this.read();
    if (!data.preferences.historyEnabled) return null;
    const lesson: Lesson = {
      id: randomUUID(), createdAt: new Date().toISOString(), question: question.trim().slice(0, 2_000),
      answer: answer.answer, steps: answer.steps.slice(0, 6), shortcut: answer.shortcut,
      topic: answer.targetLabel || context.activeWindow.class || "Omarchy",
      app: context.activeWindow.class || null, workspace: context.activeWindow.workspace,
    };
    data.lessons.unshift(lesson); data.lessons = data.lessons.slice(0, 500); this.write(data); return copyLesson(lesson);
  }

  deleteLesson(id: string): boolean {
    const data = this.read(); const length = data.lessons.length;
    data.lessons = data.lessons.filter(lesson => lesson.id !== id);
    if (data.lessons.length === length) return false;
    this.write(data); return true;
  }

  clearLessons(): void { const data = this.read(); data.lessons = []; this.write(data); }

  private read(): LearningData {
    if (!existsSync(this.path)) return structuredClone(defaults);
    try {
      const value = JSON.parse(readFileSync(this.path, "utf8")) as Partial<LearningData>;
      const data: LearningData = {
        version: 2,
        preferences: normalizePreferences(value.preferences),
        lessons: Array.isArray(value.lessons) ? value.lessons.map(sanitizeLesson).filter((lesson): lesson is Lesson => lesson !== null).slice(0, 500) : [],
      };
      if (value.version !== 2) this.write(data);
      return data;
    } catch { return structuredClone(defaults); }
  }

  private write(data: LearningData): void {
    const directory = dirname(this.path); mkdirSync(directory, { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, this.path);
  }
}

export function calculateStats(lessons: readonly Lesson[]): LearningStats {
  const shortcuts = new Set(lessons.flatMap(lesson => lesson.shortcut ? [lesson.shortcut] : []));
  const topics = new Set(lessons.map(lesson => lesson.topic));
  const days = new Set(lessons.map(lesson => localDay(new Date(lesson.createdAt))));
  let cursor = new Date(); let streak = 0;
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(localDay(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return { lessons: lessons.length, shortcuts: shortcuts.size, topics: topics.size, streak };
}

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function copyLesson(lesson: Lesson): Lesson { return { ...lesson, steps: [...lesson.steps] }; }

function normalizePreferences(value: unknown): Preferences {
  const input = value && typeof value === "object" ? value as Partial<Preferences> : {};
  return {
    onboardingComplete: typeof input.onboardingComplete === "boolean" ? input.onboardingComplete : false,
    historyEnabled: typeof input.historyEnabled === "boolean" ? input.historyEnabled : false,
    ttsEnabled: typeof input.ttsEnabled === "boolean" ? input.ttsEnabled : false,
    ttsVoice: typeof input.ttsVoice === "string" && TTS_VOICES.includes(input.ttsVoice as TtsVoice) ? input.ttsVoice as TtsVoice : "coral",
    ttsSpeed: typeof input.ttsSpeed === "number" && Number.isFinite(input.ttsSpeed) ? Math.max(0.75, Math.min(1.5, input.ttsSpeed)) : 1,
    guideTiming: typeof input.guideTiming === "string" && GUIDE_TIMINGS.includes(input.guideTiming as GuideTiming) ? input.guideTiming as GuideTiming : "adaptive",
  };
}

function sanitizeLesson(value: unknown): Lesson | null {
  if (!value || typeof value !== "object") return null;
  const lesson = value as Partial<Lesson>;
  if (typeof lesson.id !== "string" || typeof lesson.createdAt !== "string" || typeof lesson.question !== "string" || typeof lesson.answer !== "string") return null;
  return {
    id: lesson.id, createdAt: lesson.createdAt, question: cleanStoredQuestion(lesson.question), answer: lesson.answer,
    steps: Array.isArray(lesson.steps) ? lesson.steps.filter((step): step is string => typeof step === "string").slice(0, 6) : [],
    shortcut: typeof lesson.shortcut === "string" ? lesson.shortcut : null,
    topic: typeof lesson.topic === "string" ? lesson.topic : "Omarchy",
    app: typeof lesson.app === "string" ? lesson.app : null,
    workspace: typeof lesson.workspace === "string" || typeof lesson.workspace === "number" ? lesson.workspace : null,
  };
}

function cleanStoredQuestion(question: string): string {
  return /Loading audio file:|Transcription completed in/.test(question) ? extractTranscriptText(question) : question;
}
