# Architecture

## Invariants

1. Screen access is explicit and visible: companion mode uses a selected region; voice mode uses the focused monitor after the second trigger.
2. Companion captures are previewed before submission. Voice captures are deliberately triggered, briefly written only to a temporary file, then retained only in memory.
3. Installed commands and current user configuration outrank remembered defaults.
4. Observation is distinct from mutation. The MVP does not change system configuration.
5. OmaTut binds only to localhost and never exposes credential-reading endpoints.

## MVP flow

```text
Chromium app (localhost only)
          |
      Node service
       /       \                 Omarchy shell IPC
Omarchy/Hyprland  explicit region capture
version, window,           |
pointer, bindings      memory-only image
       \                  /
        Responses API vision
                 |
 target + answer + steps + shortcut
                 |
      Quickshell click-through overlay
```

`slurp` returns the selected logical desktop geometry and `grim` captures it into an app-owned temporary file. OmaTut reads it into memory and immediately removes the temporary file. The in-memory copy expires after ten minutes or when replaced.

## Overlay contract

The user-owned `benryanx.omatut` plugin registers the `omatut` IPC target inside the existing `omarchy-shell` process. The service sends `status`, `guide`, and `dismiss` messages. The QML plugin owns visual spotlighting, the buddy, the teaching bubble, and keycaps; the service owns capture, system context, model calls, policy, coordinate mapping, and ephemeral state.

The overlay is a full-screen layer-shell surface with an empty input region. It cannot steal focus or block the target underneath it. This split also keeps arbitrary system commands out of the presentation layer and allows the overlay to disappear without interrupting an in-flight explanation. Multi-step answers automatically advance their highlighted step every 2.8 seconds, mirroring Navi's passive teaching flow.

## Voice flow

```text
omatut-voice (first trigger)
          |
  pw-record + visible listening status
          |
omatut-voice (second trigger)
          |
 stop audio -> hide overlay -> capture focused monitor
          |
 local Voxtype transcript -> Responses API vision
          |
       overlay guide
```

The temporary WAV and PNG are removed immediately after being read. `omatut-dismiss` cancels an active recording as well as hiding guidance. The launcher action is installed globally, while a compositor binding remains an explicit user choice.
