#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}"
BIN_DIR="$HOME/.local/bin"

systemctl --user disable --now omatut.service 2>/dev/null || true
omarchy plugin disable benryanx.omatut 2>/dev/null || true
rm -f "$CONFIG_DIR/systemd/user/omatut.service"
rm -f "$CONFIG_DIR/omarchy/hooks/theme-set.d/omatut-theme-hook"
rm -rf "$CONFIG_DIR/omarchy/plugins/benryanx.omatut"
rm -f "$CONFIG_DIR/omarchy/themed/omatut.css.tpl"
rm -f "$DATA_DIR/applications/omatut.desktop" "$DATA_DIR/icons/hicolor/scalable/apps/omatut.svg"
rm -f "$BIN_DIR/omatut" "$BIN_DIR/omatut-voice" "$BIN_DIR/omatut-dismiss" "$BIN_DIR/omatut-uninstall"
systemctl --user daemon-reload
omarchy-shell shell rescanPlugins 2>/dev/null || true

echo "OmaTut desktop integration removed. Your learning journal remains in ~/.local/state/omatut."
