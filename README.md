# OmaTut

OmaTut is a screen-aware tutor for Omarchy, shaped around the interaction model of [Navi](https://github.com/benryanx/navi): choose something on your desktop, ask what it does, and a small buddy flies to the target with the exact shortcut or next step.

## Current MVP

- A Navi-style, click-through Omarchy shell overlay with a buddy, target pulse, “Here” label, teaching bubble, shortcut card, and status pill.
- A Navi-style two-press voice loop: trigger once to listen, trigger again to capture the focused monitor and ask.
- A gentle desktop ping when listening begins and playful rotating progress messages while OmaTut works.
- An OmaTut-owned speech vocabulary that preserves critical Omarchy ecosystem names without changing global dictation settings.
- A first-run companion setup, opt-in local learning journal, progress dashboard, and on-demand AI learning summaries.
- Optional OpenAI voice playback with voice and speed controls; generated audio is removed after playback.
- Normalized visual target coordinates mapped back into the selected desktop region.
- Explicit region capture with an on-screen preview before anything is sent.
- Live Omarchy version, channel, active window, workspace, pointer, and keybinding context.
- Vision guidance through the OpenAI Responses API.
- Structured answers with a concise explanation, ordered steps, and a prominent shortcut card.
- Screenshots are held only in memory, replaced by the next capture, and never added to an OmaTut history.
- Localhost-only service with origin validation, a restrictive content security policy, and API keys stored in Secret Service.

The Chromium companion window handles setup, deliberate screen selection, and a fallback answer view. The primary teaching response appears in the transparent Omarchy overlay and never steals focus or blocks clicks.

## Run locally

Requirements: Omarchy 4+, Node.js 24+, Chromium, `secret-tool`, Voxtype, PipeWire's `pw-record` and `pw-play`, and the standard Omarchy screenshot tools.

```bash
cd /home/benpc1/Work/omatut
npm test
npm start
```

Open `http://127.0.0.1:47841`, add an OpenAI API key under Settings, choose **See my screen**, select a region, and ask a question.

## Install on Omarchy

```bash
npm run install:desktop
```

This installs user-owned desktop integration, a systemd user service, the launcher, icon, Omarchy theme template, and the `benryanx.omatut` shell overlay plugin. It enables the plugin but does not alter Hyprland bindings. Launch **OmaTut** from the app launcher.

## Navi-style voice guidance

Run `omatut-voice` once and speak your question. Run it again to stop listening. OmaTut then hides its overlay, captures only the focused monitor, transcribes locally with Voxtype, and sends the transcript plus screenshot for guidance. Run `omatut-dismiss` to cancel recording or hide the guide.

The installer deliberately leaves the shortcut choice to you. `SUPER + SHIFT + T` is the recommended binding because it is mnemonic for Tutor and was unassigned in the stock Omarchy 4.0.2 catalogue:

```lua
o.bind("SUPER + SHIFT + T", "Ask OmaTut", "omatut-voice")
o.bind("ESCAPE", nil, "omatut-dismiss", { non_consuming = true })
```

Check `omarchy menu keybindings --print` before adding these because future Omarchy releases or personal configuration may use the same keys. The non-consuming Escape hook lets the active application continue receiving Escape and only dismisses OmaTut when its overlay is open. After changing the file, validate it with `hyprctl reload` and `hyprctl configerrors`.

## Learning companion

The companion opens with a one-time setup for learning history and tutor voice. Home shows recent lessons and meaningful counts; Learning contains the full journal; Ask retains deliberate region capture. When enabled, the journal stores only the question, answer, steps, shortcut, topic, application name, workspace, and time in `~/.local/state/omatut/learning.json` with user-only permissions.

Voice playback uses OpenAI's `gpt-4o-mini-tts` model and is off until enabled. The selected AI-generated voice speaks the explanation and ordered steps, can be stopped by dismissing OmaTut, and is never saved to the journal. Guide timing can be adaptive, fixed, or persistent; hovering pauses a running timer. Learning summaries are generated only when **Summarize my learning** is pressed.

## Privacy contract

1. OmaTut captures only after an explicit action.
2. Companion-mode captures are shown before submission; voice-mode captures are scoped to the focused monitor and initiated by the second voice trigger.
3. Screen pixels are sent only after **Ask OmaTut** or the second `omatut-voice` trigger.
4. Captures are kept in runtime memory only and expire after ten minutes.
5. The OpenAI key is stored in the desktop keyring, never in this repository or a settings file.
6. Learning history is opt-in, structured, local, and user-deletable; it never contains screen or microphone data.
7. Learning notes are sent for an AI summary only after the user presses the summary button.

Exact-name checks performed on 2 September 2026 found no `omatut` package on npm, PyPI, or AUR, and no exact `omarchy/omatut` GitHub repository. This is a practical collision check, not trademark clearance.
