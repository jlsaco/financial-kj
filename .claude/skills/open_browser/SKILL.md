---
name: open_browser
description: >
  Launches Playwright to test the FinanceKJ app in a real browser, ALWAYS in an
  iPhone SE (375x667) mobile viewport. Manages browser lifecycle, screenshot
  naming, and the evidence directory. Built on playwright-cli.
allowed-tools: Bash(playwright-cli:*) Bash(mkdir:*) Bash(bash .claude/skills/open_browser/scripts/playwright.sh:*) Bash(curl:*)
---

# Mobile E2E Browser Testing (iPhone SE 375x667)

Opens a real browser to test the FinanceKJ app, interacts with the UI like a
user on a phone would, and captures evidence screenshots with a consistent
naming convention.

## 📱 The viewport is always iPhone SE 375x667

FinanceKJ is mobile-first. The browser opened by this skill is automatically
emulated as an **iPhone SE (3rd gen): 375×667 px, deviceScaleFactor 2, touch
enabled** via `.playwright/cli.config.json`. **All UI must be validated at this
size.** You never need to pass a viewport flag.

## Usage

```bash
# Initialize the browser session (mobile) and the evidence directory
bash .claude/skills/open_browser/scripts/playwright.sh <view-name> [path] [pass|fail]
```

- `<view-name>` — short slug for the screen under test, e.g. `dashboard`, `gastos`, `presupuestos`.
- `[path]` — optional app path (default `/`), e.g. `/gastos`.
- `[pass|fail]` — optional status for the screenshot name (default `pass`).

The script opens `http://localhost:3000<path>` in a visible (`--headed`) mobile
browser and prints the evidence screenshot path to use.

## Screenshot naming convention

All screenshots go to `docs/evidence/` with this format:

```
docs/evidence/[view-name]-[YYYY-MM-DD]-[pass|fail].png
```

Examples:
- `docs/evidence/dashboard-2026-06-03-pass.png`
- `docs/evidence/gastos-2026-06-03-fail.png`

The date and status are deliberate — they serve as historical reference and as
the graphic evidence attached to pull requests.

## Interaction workflow

After launching the browser with the script, use `playwright-cli` directly:

```bash
# 1. The script opens a VISIBLE mobile browser to localhost:3000 (--headed)

# 2. Confirm the mobile viewport (optional sanity check)
playwright-cli --raw eval "JSON.stringify({w: innerWidth, h: innerHeight, dpr: devicePixelRatio})"
# expected: {"w":375,"h":667,"dpr":2}

# 3. Take a snapshot to find UI elements (use the element refs it returns)
playwright-cli snapshot

# 4. Interact like a user on a phone (tap buttons, fill inputs, open the menu)
playwright-cli click e9
playwright-cli fill e5 "100000"

# 5. Wait for content to render — poll with snapshots, don't sleep blindly
playwright-cli snapshot

# 6. Take the evidence screenshot (full mobile page)
playwright-cli screenshot --filename="docs/evidence/dashboard-2026-06-03-pass.png"

# 7. Close the browser
playwright-cli close
```

## Prerequisites

- `npm run dev` must be running on port 3000 (the script verifies this).
- `playwright-cli` must be available in PATH.
- System Google Chrome must be installed (the mobile config uses the `chrome` channel).

## Important

The script handles session lifecycle, the mobile viewport (via the default
config), and directory setup. The actual interaction sequence is performed with
`playwright-cli` commands directly. ALWAYS take a screenshot — it is the graphic
evidence for the change and is attached to the PR.
