#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CaptureStore, captureFocusedMonitor, captureRegion } from "./capture.ts";
import { readDesktopContext } from "./omarchy.ts";
import { getOpenAIKey, setOpenAIKey } from "./secrets.ts";
import { OpenAITutor } from "./tutor.ts";
import { dismissOverlay, overlayAvailable, showOverlayGuide, showOverlayStatus } from "./overlay.ts";
import { transcribeRecording, VoiceRecorder } from "./voice.ts";

const HOST = process.env.OMATUT_HOST || "127.0.0.1";
const PORT = Number(process.env.OMATUT_PORT || 47841);
const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
const themeCss = join(homedir(), ".local", "state", "omarchy", "current", "theme", "omatut.css");
const captures = new CaptureStore();
const voice = new VoiceRecorder();
let voiceBusy = false;
const themeClients = new Set<ServerResponse>();

const server = createServer(async (req, res) => {
  try {
    setSecurityHeaders(res);
    if (req.method === "OPTIONS") return end(res, 204);
    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    if (url.pathname.startsWith("/api/")) { validateOrigin(req); return await api(req, res, url); }
    if (url.pathname === "/omarchy-theme.css") return existsSync(themeCss) ? streamFile(res, themeCss, "text/css; charset=utf-8") : end(res, 204);
    return serveStatic(res, url.pathname);
  } catch (error) {
    console.error(error);
    return json(res, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
});

async function api(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  if (req.method === "GET" && url.pathname === "/api/theme/events") {
    res.statusCode = 200; res.setHeader("Content-Type", "text/event-stream"); res.setHeader("Connection", "keep-alive");
    res.write("data: connected\n\n"); themeClients.add(res); req.once("close", () => themeClients.delete(res)); return;
  }
  if (req.method === "POST" && url.pathname === "/api/theme/changed") {
    for (const client of themeClients) client.write("data: changed\n\n");
    return json(res, { ok: true });
  }
  if (req.method === "GET" && url.pathname === "/api/status") {
    const [context, overlayConnected] = await Promise.all([readDesktopContext(), overlayAvailable()]);
    return json(res, { ready: true, keyConfigured: Boolean(getOpenAIKey()), captureReady: Boolean(captures.get()), overlayConnected, voice: { recording: voice.recording, busy: voiceBusy }, context });
  }
  if (req.method === "PUT" && url.pathname === "/api/settings/openai-key") {
    const body = await jsonBody(req); await setOpenAIKey(String(body.key || "")); return json(res, { ok: true });
  }
  if (req.method === "POST" && url.pathname === "/api/capture") {
    await dismissOverlay();
    const capture = captures.set(await captureRegion());
    return json(res, { id: capture.id, mime: capture.mime, createdAt: capture.createdAt, geometry: capture.geometry }, 201);
  }
  if (req.method === "DELETE" && url.pathname === "/api/capture") { captures.clear(); return json(res, { ok: true }); }
  if (req.method === "GET" && url.pathname.startsWith("/api/capture/")) {
    const capture = captures.get(url.pathname.split("/").at(-1));
    if (!capture) throw new Error("That capture expired. Select the region again.");
    res.statusCode = 200; res.setHeader("Content-Type", capture.mime); res.setHeader("Content-Length", capture.bytes.length); res.end(capture.bytes); return;
  }
  if (req.method === "POST" && url.pathname === "/api/ask") {
    const body = await jsonBody(req); const capture = captures.get(String(body.captureId || ""));
    if (!capture) throw new Error("Select a screen region before asking.");
    const key = getOpenAIKey(); if (!key) throw new Error("Add an OpenAI API key in Settings first.");
    await showOverlayStatus("thinking", "Looking at your screen…");
    const context = await readDesktopContext();
    const answer = await new OpenAITutor(key).ask(String(body.question || ""), capture, context);
    await showOverlayGuide(answer, capture);
    return json(res, { answer, context });
  }
  if (req.method === "POST" && url.pathname === "/api/voice/toggle") {
    if (voiceBusy) throw new Error("OmaTut is still working on your last question.");
    if (!voice.recording) {
      if (!getOpenAIKey()) throw new Error("Add an OpenAI API key in Settings first.");
      await voice.start();
      await showOverlayStatus("listening", "Listening… trigger OmaTut again to ask");
      return json(res, { state: "listening" }, 202);
    }
    voiceBusy = true; let recordingPath: string | null = null;
    try {
      recordingPath = await voice.stop();
      await dismissOverlay();
      const capture = captures.set(await captureFocusedMonitor());
      await showOverlayStatus("thinking", "Transcribing your question…");
      const question = await transcribeRecording(recordingPath); recordingPath = null;
      await showOverlayStatus("thinking", "Looking at your screen…");
      const context = await readDesktopContext();
      const answer = await new OpenAITutor(getOpenAIKey()).ask(question, capture, context);
      await showOverlayGuide(answer, capture);
      return json(res, { state: "guide", question, answer, context });
    } catch (error) {
      await dismissOverlay();
      throw error;
    } finally {
      voiceBusy = false;
      if (recordingPath) await unlink(recordingPath).catch(() => undefined);
    }
  }
  if (req.method === "POST" && url.pathname === "/api/overlay/dismiss") {
    await voice.cancel(); await dismissOverlay(); return json(res, { ok: true });
  }
  return json(res, { error: "Not found" }, 404);
}

function serveStatic(res: ServerResponse, pathname: string): void {
  const target = pathname === "/" ? join(publicDir, "index.html") : resolve(publicDir, `.${pathname}`);
  if ((!target.startsWith(`${publicDir}/`) && target !== join(publicDir, "index.html")) || !existsSync(target)) return json(res, { error: "Not found" }, 404);
  const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
  return streamFile(res, target, types[extname(target)] || "application/octet-stream");
}

function streamFile(res: ServerResponse, path: string, type: string): void { res.statusCode = 200; res.setHeader("Content-Type", type); createReadStream(path).pipe(res); }
function setSecurityHeaders(res: ServerResponse): void {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'");
  res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Referrer-Policy", "no-referrer"); res.setHeader("Cache-Control", "no-store");
}
function validateOrigin(req: IncomingMessage): void { const origin = req.headers.origin; if (origin && ![`http://${HOST}:${PORT}`, `http://localhost:${PORT}`].includes(origin)) throw new Error("Untrusted request origin."); }
async function jsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 1_000_000) throw new Error("Request too large."); chunks.push(chunk); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}
function json(res: ServerResponse, body: unknown, status = 200): void { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(body)); }
function end(res: ServerResponse, status: number): void { res.statusCode = status; res.end(); }

server.listen(PORT, HOST, () => console.log(`OmaTut ready at http://${HOST}:${PORT}`));
