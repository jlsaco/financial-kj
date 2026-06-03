#!/usr/bin/env bash
set -euo pipefail

# Mobile E2E launcher for FinanceKJ.
# Opens the app in a headed browser ALWAYS emulated as iPhone SE (375x667),
# enforced by .playwright/cli.config.json (loaded automatically by playwright-cli).

NAME="${1:?Usage: playwright.sh <view-name> [path] [pass|fail]}"
APP_PATH="${2:-/}"
STATUS="${3:-pass}"

DATE=$(date +%Y-%m-%d)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
EVIDENCE_DIR="$PROJECT_DIR/docs/evidence"
FILENAME="${NAME}-${DATE}-${STATUS}.png"
URL="http://localhost:3000${APP_PATH}"

# Ensure evidence directory exists
mkdir -p "$EVIDENCE_DIR"

# Verify dev server is running
if ! curl -s --connect-timeout 3 http://localhost:3000 > /dev/null 2>&1; then
  echo "Error: Dev server not running on port 3000. Start with 'npm run dev' first." >&2
  exit 1
fi

# Make sure no stale session keeps a desktop-sized context around
playwright-cli close-all > /dev/null 2>&1 || true

# Open browser in headed mode (visible window) — the default config file
# .playwright/cli.config.json forces the iPhone SE 375x667 mobile viewport.
playwright-cli open --headed "$URL"

# Sanity-check the viewport so it's obvious in the logs that this is mobile
VIEWPORT=$(playwright-cli --raw eval "JSON.stringify({w: innerWidth, h: innerHeight, dpr: devicePixelRatio})" 2>/dev/null || echo "unknown")

echo "Browser opened (mobile / iPhone SE) at $URL"
echo "Viewport: $VIEWPORT   (expected {\"w\":375,\"h\":667,\"dpr\":2})"
echo "Evidence path: $EVIDENCE_DIR/$FILENAME"
echo ""
echo "Use playwright-cli commands to interact:"
echo "  playwright-cli snapshot          # See page structure"
echo "  playwright-cli click <ref>       # Tap a button"
echo "  playwright-cli fill <ref> \"...\"  # Enter a value"
echo "  playwright-cli screenshot --filename=\"$EVIDENCE_DIR/$FILENAME\""
echo "  playwright-cli close             # End session"
