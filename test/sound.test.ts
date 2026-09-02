import test from "node:test";
import assert from "node:assert/strict";
import { playActivationPing } from "../src/sound.ts";

test("activation ping uses the desktop sound theme at a gentle volume", async () => {
  let command = ""; let args: readonly string[] = [];
  await playActivationPing(async (file, nextArgs = []) => {
    command = file; args = nextArgs; return { stdout: "", stderr: "" };
  });
  assert.equal(command, "canberra-gtk-play");
  assert.deepEqual(args, ["--id=message-new-instant", "--description=OmaTut is listening", "--volume=-8.0"]);
});

test("activation ping remains optional when desktop audio is unavailable", async () => {
  await assert.doesNotReject(playActivationPing(async () => { throw new Error("not installed"); }));
});
