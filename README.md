# OmaTut · early alpha

OmaTut is a screen-aware tutor for Omarchy, shaped around the interaction model of [Navi](https://github.com/benryanx/navi): ask about what is on your desktop, and a small buddy flies to the target with the exact shortcut or next step.

OmaTut is an early alpha for Omarchy 4.x. It is usable, but its installer and desktop integration need feedback from real Omarchy setups before a broader package release.

## What it does

- A Navi-style, click-through Omarchy shell overlay with a buddy, target pulse, “Here” label, teaching bubble, shortcut card, and status pill.
- A Navi-style two-press voice loop: trigger once to listen, trigger again to capture the focused monitor and ask.
- A gentle desktop ping when listening begins and playful rotating progress messages while OmaTut works.
- An OmaTut-owned speech vocabulary that preserves critical Omarchy ecosystem names without changing global dictation settings.
- A first-run companion setup, opt-in local learning journal, progress dashboard, and periodic AI learning observations.
- Optional OpenAI voice playback with voice and speed controls; generated audio is removed after playback.
- Normalized visual target coordinates mapped back into the selected desktop region.
- Live Omarchy version, channel, active window, workspace, pointer, and keybinding context.
- Vision guidance through OpenAI, local Ollama vision models, or OpenAI-compatible APIs.
- Structured answers with a concise explanation, ordered steps, and a prominent shortcut card.
- Screenshots are held only in memory, replaced by the next capture, and never added to an OmaTut history.
- Localhost-only service with origin validation, a restrictive content security policy, and API keys stored in Secret Service.

The Chromium companion window handles setup, learning progress, and the local journal. The primary teaching response appears in the transparent Omarchy overlay and never steals focus or blocks clicks.

## Try the alpha on Omarchy

Requirements: Omarchy 4+, Node.js 24+, Chromium, `secret-tool`, Voxtype, PipeWire's `pw-record` and `pw-play`, and the standard Omarchy screenshot tools.

```bash
git clone https://github.com/benryanx/omatut.git
cd omatut
npm test
npm run install:desktop
```

Launch **OmaTut** from the app launcher. In Settings, choose an AI tutor: OpenAI needs its API key; Ollama uses its local endpoint (default `http://127.0.0.1:11434`) and a vision-capable local model; compatible providers need a base URL, model, and API key.

The installer adds user-owned desktop integration, a systemd user service, launcher, icon, Omarchy theme template, and the `benryanx.omatut` shell overlay plugin. It does not alter your Hyprland bindings.

### Omarchy Plugin Marketplace installation

The marketplace installs the overlay repository first. Run the included setup once afterward to install the companion service and launchers:

```bash
omarchy plugin add https://github.com/benryanx/omatut.git --enable
~/.config/omarchy/plugins/benryanx.omatut/scripts/install-desktop.sh
```

External runtime dependencies are Omarchy 4.x, Node.js 24 or newer, Chromium, Voxtype, PipeWire, Secret Service (`secret-tool`), `grim`, `slurp`, and `libcanberra`. The planned `omatut-git` AUR recipe declares these dependencies automatically.

### Remove OmaTut

Run the user-owned removal helper before removing the source or AUR package:

```bash
omatut-uninstall
```

This disables the service and removes the OmaTut launcher, theme hook, and shell overlay. It deliberately preserves the local learning journal in `~/.local/state/omatut`; users may archive or delete that directory separately.

## Navi-style voice guidance

Run `omatut-voice` once and speak your question. Run it again to stop listening. OmaTut then hides its overlay, captures only the focused monitor, transcribes locally with Voxtype, and sends the transcript plus screenshot for guidance. Run `omatut-dismiss` to cancel recording or hide the guide.

The installer deliberately leaves the shortcut choice to you. `SUPER + SHIFT + T` is the recommended binding because it is mnemonic for Tutor and was unassigned in the stock Omarchy 4.0.2 catalogue:

```lua
o.bind("SUPER + SHIFT + T", "Ask OmaTut", "omatut-voice")
o.bind("ESCAPE", nil, "omatut-dismiss", { non_consuming = true })
```

Check `omarchy menu keybindings --print` before adding these because future Omarchy releases or personal configuration may use the same keys. The non-consuming Escape hook lets the active application continue receiving Escape and only dismisses OmaTut when its overlay is open. After changing the file, validate it with `hyprctl reload` and `hyprctl configerrors`.

## Learning companion

The companion opens with a one-time setup for learning history and tutor voice. Home shows progress, an AI observation, and one recommended next Omarchy topic; Learnings contains the full journal. Home refreshes its observation when the companion opens; **More** creates another perspective, while **Show me** turns the recommendation into an on-screen lesson without capturing the screen. Observations use the selected tutor provider and only locally stored lesson data. An open companion refreshes its journal and statistics immediately after a voice-guided lesson completes. When enabled, the journal stores only the question, answer, steps, shortcut, topic, application name, workspace, time, and generated observations in `~/.local/state/omatut/learning.json` with user-only permissions.

The AI tutor can use OpenAI's Responses API, Ollama's local chat API, or an OpenAI-compatible Chat Completions endpoint. Ollama users should select a vision-capable model because OmaTut sends the focused monitor with every question. Provider keys are stored separately in Secret Service. Voice playback uses OpenAI's `gpt-4o-mini-tts` model and is off until enabled; it can retain a separate OpenAI key when the tutor uses another provider. The selected AI-generated voice speaks the explanation and ordered steps, can be stopped by dismissing OmaTut, and is never saved to the journal. Guide timing can be adaptive, fixed, or persistent; hovering pauses a running timer.

## Privacy contract

1. OmaTut captures only after an explicit action.
2. Voice-mode captures are scoped to the focused monitor and initiated by the second voice trigger.
3. Screen pixels are sent only after the second `omatut-voice` trigger.
4. Captures are kept in runtime memory only and expire after ten minutes.
5. Provider keys are stored in the desktop keyring, never in this repository or a settings file.
6. Learning history is opt-in, structured, local, and user-deletable; it never contains screen or microphone data.
7. When Home refreshes an observation or the user presses **More**, local learning notes are sent only to the tutor provider selected in Settings; they never include screen or microphone data. **Show me** sends only the displayed recommendation to create its guide.

## License

OmaTut is released under the [MIT License](LICENSE).

## Release status

See [CHANGELOG.md](CHANGELOG.md) for alpha milestones and known limitations. A release is a tested Git tag with release notes; an AUR package will follow once the alpha installer has been tested on a wider range of Omarchy machines.

Exact-name checks performed on 2 September 2026 found no `omatut` package on npm, PyPI, or AUR, and no exact `omarchy/omatut` GitHub repository. This is a practical collision check, not trademark clearance.
