import type { Capture } from "./capture.ts";
import type { TutorAnswer } from "./tutor.ts";
import type { CommandRunner } from "./command.ts";
import { runCommand } from "./command.ts";
import type { GuideTiming } from "./learning.ts";

const TARGET = "omatut";

export async function overlayAvailable(run: CommandRunner = runCommand): Promise<boolean> {
  try { return (await run("omarchy-shell", [TARGET, "ping"])).stdout.trim() === "ok"; }
  catch { return false; }
}

export async function showOverlayStatus(mode: "listening" | "seeing" | "thinking", message: string, run: CommandRunner = runCommand): Promise<void> {
  await call("status", JSON.stringify({ mode, message }), run);
}

export async function showOverlayGuide(answer: TutorAnswer, capture: Capture, timing: GuideTiming = "adaptive", run: CommandRunner = runCommand): Promise<void> {
  const hasTarget = answer.targetX !== null && answer.targetY !== null;
  const targetX = hasTarget ? capture.geometry.x + capture.geometry.width * answer.targetX! / 1000 : null;
  const targetY = hasTarget ? capture.geometry.y + capture.geometry.height * answer.targetY! / 1000 : null;
  await call("guide", JSON.stringify({
    targetX, targetY,
    label: answer.targetLabel || "Here",
    explanation: answer.answer,
    steps: answer.steps,
    shortcut: answer.shortcut,
    duration: guideDuration(answer, timing),
  }), run);
}

export function guideDuration(answer: Pick<TutorAnswer, "answer" | "steps" | "shortcut">, timing: GuideTiming): number {
  if (timing === "brief") return 15_000;
  if (timing === "relaxed") return 45_000;
  if (timing === "persistent") return 0;
  const words = [answer.answer, ...answer.steps, answer.shortcut || ""].join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(18_000, Math.min(75_000, 12_000 + words * 320));
}

export async function dismissOverlay(run: CommandRunner = runCommand): Promise<void> {
  await call("dismiss", "", run);
}

async function call(method: string, argument: string, run: CommandRunner): Promise<void> {
  try { await run("omarchy-shell", argument ? [TARGET, method, argument] : [TARGET, method]); }
  catch { /* The companion app remains usable when the optional overlay is not installed. */ }
}
