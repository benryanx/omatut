# Architecture

## Invariants

1. Screen access is explicit, visible, and scoped to a user-selected region.
2. The captured image is previewed before submission and is never written to OmaTut's application data.
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

The overlay is a full-screen layer-shell surface with an empty input region. It cannot steal focus or block the target underneath it. This split also keeps arbitrary system commands out of the presentation layer and allows the overlay to disappear without interrupting an in-flight explanation.
