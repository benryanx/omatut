#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node)"
SYSTEMD_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
APPLICATION_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICON_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/scalable/apps"
BIN_DIR="$HOME/.local/bin"
THEMED_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/omarchy/themed"
PLUGIN_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/omarchy/plugins/benryanx.omatut"

omarchy plugin validate "$APP_DIR/plugin"
mkdir -p "$SYSTEMD_DIR" "$APPLICATION_DIR" "$ICON_DIR" "$BIN_DIR" "$THEMED_DIR" "$PLUGIN_DIR"
sed -e "s|@NODE_BIN@|$NODE_BIN|g" -e "s|@APP_DIR@|$APP_DIR|g" "$APP_DIR/scripts/omatut.service.in" > "$SYSTEMD_DIR/omatut.service"
sed -e "s|@LAUNCHER@|$BIN_DIR/omatut|g" -e "s|@VOICE@|$BIN_DIR/omatut-voice|g" -e "s|@DISMISS@|$BIN_DIR/omatut-dismiss|g" "$APP_DIR/scripts/omatut.desktop.in" > "$APPLICATION_DIR/omatut.desktop"
sed -e "s|@APP_DIR@|$APP_DIR|g" "$APP_DIR/scripts/omatut-launch.in" > "$BIN_DIR/omatut"
install -m 0755 "$APP_DIR/scripts/omatut-voice.in" "$BIN_DIR/omatut-voice"
install -m 0755 "$APP_DIR/scripts/omatut-dismiss.in" "$BIN_DIR/omatut-dismiss"
chmod 755 "$BIN_DIR/omatut"
cp "$APP_DIR/public/icon.svg" "$ICON_DIR/omatut.svg"
cp "$APP_DIR/scripts/omatut.css.tpl" "$THEMED_DIR/omatut.css.tpl"
install -m 0644 "$APP_DIR/plugin/manifest.json" "$PLUGIN_DIR/manifest.json"
install -m 0644 "$APP_DIR/plugin/Overlay.qml" "$PLUGIN_DIR/Overlay.qml"
omarchy hook install theme-set "$APP_DIR/scripts/omatut-theme-hook"
omarchy theme refresh
omarchy-shell shell rescanPlugins
omarchy plugin enable benryanx.omatut
systemctl --user daemon-reload
systemctl --user enable omatut.service
systemctl --user restart omatut.service
command -v update-desktop-database >/dev/null && update-desktop-database "$APPLICATION_DIR" || true
echo "OmaTut installed. Launch the companion with 'omatut' or toggle voice guidance with 'omatut-voice'."
