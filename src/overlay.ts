import type { Capture } from "./capture.ts";
import type { TutorAnswer } from "./tutor.ts";
import type { CommandRunner } from "./command.ts";
import { runCommand } from "./command.ts";

const TARGET = "omatut";

export async function overlayAvailable(run: CommandRunner = runCommand): Promise<boolean> {
  try { return (await run("omarchy-shell", [TARGET, "ping"])).stdout.trim() === "ok"; }
  catch { return false; }
}

export async function showOverlayStatus(mode: "listening" | "seeing" | "thinking", message: string, run: CommandRunner = runCommand): Promise<void> {
  await call("status", JSON.stringify({ mode, message }), run);
}

export async function showOverlayGuide(answer: TutorAnswer, capture: Capture, run: CommandRunner = runCommand): Promise<void> {
  const hasTarget = answer.targetX !== null && answer.targetY !== null;
  const targetX = hasTarget ? capture.geometry.x + capture.geometry.width * answer.targetX! / 1000 : null;
  const targetY = hasTarget ? capture.geometry.y + capture.geometry.height * answer.targetY! / 1000 : null;
  await call("guide", JSON.stringify({
    targetX, targetY,
    label: answer.targetLabel || "Here",
    explanation: answer.answer,
    steps: answer.steps,
    shortcut: answer.shortcut,
    duration: 14_000,
  }), run);
}

export async function dismissOverlay(run: CommandRunner = runCommand): Promise<void> {
  await call("dismiss", "", run);
}

async function call(method: string, argument: string, run: CommandRunner): Promise<void> {
  try { await run("omarchy-shell", argument ? [TARGET, method, argument] : [TARGET, method]); }
  catch { /* The companion app remains usable when the optional overlay is not installed. */ }
}
