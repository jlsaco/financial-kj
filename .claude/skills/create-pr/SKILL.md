---
name: create-pr
description: >
  Create a GitHub pull request for FinanceKJ that ALWAYS includes graphic
  evidence (screenshots) of the changes. Captures the affected screens in the
  iPhone SE 375x667 mobile viewport, commits them under docs/evidence/, and
  embeds them inline in the PR body. Use whenever you are asked to open a PR.
allowed-tools: Bash(playwright-cli:*) Bash(bash .claude/skills/open_browser/scripts/playwright.sh:*) Bash(bash .claude/skills/create-pr/scripts/create-pr.sh:*) Bash(git:*) Bash(gh:*) Bash(mkdir:*) Bash(curl:*)
---

# Create a PR with mandatory graphic evidence

In FinanceKJ **no pull request is opened without graphic evidence of the
changes**. The reviewer must be able to see the result, not just read a diff.
Because the app is mobile-first, the evidence is captured at the **iPhone SE
375×667** viewport.

> Hard rule: if you cannot produce at least one screenshot of the change, do NOT
> create the PR. Either get the app running and capture it, or stop and report
> why evidence is impossible (e.g. backend-only change) and ask the user how to
> proceed. A PR body that only describes the change is not acceptable.

## Workflow

### 1. Make sure the change is visible and the dev server is running

```bash
curl -s --connect-timeout 3 http://localhost:3000 > /dev/null || npm run dev &
```

### 2. Capture evidence at 375×667 for every screen you touched

Use the `open_browser` skill (mobile viewport is automatic) and take a
screenshot per affected view. Capture a **before/after** pair when the change is
a visual modification of an existing screen.

```bash
# open the affected screen in the mobile browser
bash .claude/skills/open_browser/scripts/playwright.sh <view-name> <path> pass

# interact if needed (open menu, fill a form, navigate), then screenshot
playwright-cli snapshot
playwright-cli screenshot --filename="docs/evidence/<view-name>-$(date +%Y-%m-%d)-pass.png"
playwright-cli close
```

Capture every screen the change affects — one screenshot is the minimum, more is
better. For a flow (e.g. add a gasto), capture the key steps.

### 3. Create the PR with the evidence embedded

Run the helper script. It stages + commits any new evidence, pushes the branch,
and creates the PR with each screenshot embedded inline (pinned to the commit
SHA so the images survive branch deletion after merge):

```bash
bash .claude/skills/create-pr/scripts/create-pr.sh \
  "feat: short PR title" \
  "Optional one-paragraph summary of the change." \
  docs/evidence/<view-name>-<date>-pass.png [more-images...]
```

- **arg 1** — PR title (required).
- **arg 2** — PR summary text (required; use "" to skip).
- **args 3+** — one or more evidence image paths (required, at least one). The
  script REFUSES to create the PR if no image is provided.

The script verifies each image exists, embeds them under a "📸 Evidencia
gráfica" section, and prints the PR URL.

## Checklist before opening a PR

- [ ] The dev server ran and the change was exercised in the browser.
- [ ] At least one screenshot at **375×667** exists under `docs/evidence/`.
- [ ] Every affected screen has evidence (before/after for visual changes).
- [ ] The PR body embeds every screenshot (the helper script does this).
- [ ] `npm run lint` and `npm run build` pass (per CLAUDE.md).
