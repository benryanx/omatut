# OmaTut

OmaTut is a screen-aware tutor for Omarchy, shaped around the interaction model of [Navi](https://github.com/benryanx/navi): choose something on your desktop, ask what it does, and a small buddy flies to the target with the exact shortcut or next step.

## Current MVP

- A Navi-style, click-through Omarchy shell overlay with a buddy, target pulse, “Here” label, teaching bubble, shortcut card, and status pill.
- Normalized visual target coordinates mapped back into the selected desktop region.
- Explicit region capture with an on-screen preview before anything is sent.
- Live Omarchy version, channel, active window, workspace, pointer, and keybinding context.
- Vision guidance through the OpenAI Responses API.
- Structured answers with a concise explanation, ordered steps, and a prominent shortcut card.
- Screenshots are held only in memory, replaced by the next capture, and never added to an OmaTut history.
- Localhost-only service with origin validation, a restrictive content security policy, and API keys stored in Secret Service.

The Chromium companion window handles setup, deliberate screen selection, and a fallback answer view. The primary teaching response appears in the transparent Omarchy overlay and never steals focus or blocks clicks.

## Run locally

Requirements: Omarchy 4+, Node.js 24+, Chromium, `secret-tool`, and the standard Omarchy screenshot tools.

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

## Privacy contract

1. OmaTut captures only after an explicit action.
2. The captured region is shown before submission.
3. Screen pixels are sent only after **Ask OmaTut** is pressed.
4. Captures are kept in runtime memory only and expire after ten minutes.
5. The OpenAI key is stored in the desktop keyring, never in this repository or a settings file.

Exact-name checks performed on 2 September 2026 found no `omatut` package on npm, PyPI, or AUR, and no exact `omarchy/omatut` GitHub repository. This is a practical collision check, not trademark clearance.
