#!/bin/sh
# Pebbl installer — get paid while you code.
#   curl -fsSL https://pebbl.space/install.sh | sh              # Claude CLI (recommended)
#   curl -fsSL https://pebbl.space/install.sh | sh -s -- vscode # Claude/Codex in VS Code
#   curl -fsSL https://pebbl.space/install.sh | sh -s -- cursor # Cursor
# Reversible. The CLI path uses only documented Claude config (no patching).
set -e

API="${PEBBL_API:-https://pebbl.space}"
SURFACE="${1:-cli}"
DIR="$HOME/.pebbl"
mkdir -p "$DIR"

# Log in (attribute earnings to your account) if PEBBL_TOKEN is provided.
if [ -n "$PEBBL_TOKEN" ]; then
  printf '%s' "$PEBBL_TOKEN" > "$DIR/account"
  echo "Logged in — earnings will go to your account."
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Pebbl needs Node.js (https://nodejs.org). Install it and re-run."; exit 1
fi

case "$SURFACE" in
  cli|claude|claude-cli)
    echo "Installing Pebbl for Claude Code CLI…"
    curl -fsSL "$API/dl/pebbl-statusline.mjs" -o "$DIR/pebbl-statusline.mjs"
    curl -fsSL "$API/dl/pebbl-cli-setup.mjs"  -o "$DIR/pebbl-cli-setup.mjs"
    PEBBL_API="$API" node "$DIR/pebbl-cli-setup.mjs"
    ;;
  vscode|codex|cursor|windsurf)
    echo "Installing Pebbl for editor spinners (VS Code / Cursor / Windsurf, Claude + Codex)…"
    curl -fsSL "$API/dl/patch-vscode.mjs" -o "$DIR/patch-vscode.mjs"
    curl -fsSL "$API/api/inventory"       -o "$DIR/inventory.json"
    PEBBL_AD_SERVER="$API" PEBBL_ADS_FILE="$DIR/inventory.json" node "$DIR/patch-vscode.mjs"
    echo "→ Reload your editor window. Undo: PEBBL_ADS_FILE=$DIR/inventory.json node $DIR/patch-vscode.mjs --restore"
    ;;
  *)
    echo "Unknown surface '$SURFACE'. Use: cli | vscode | cursor"; exit 1
    ;;
esac
