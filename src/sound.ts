import { runCommand, type CommandRunner } from "./command.ts";

export async function playActivationPing(run: CommandRunner = runCommand): Promise<void> {
  try {
    await run("canberra-gtk-play", [
      "--id=message-new-instant",
      "--description=OmaTut is listening",
      "--volume=-8.0",
    ]);
  } catch {
    // Sound is a friendly acknowledgement, never a requirement for voice input.
  }
}
