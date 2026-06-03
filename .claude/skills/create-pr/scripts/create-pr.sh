#!/usr/bin/env bash
set -euo pipefail

# Create a GitHub PR for FinanceKJ that ALWAYS embeds graphic evidence.
#
# Usage:
#   create-pr.sh "<title>" "<summary>" <evidence-image> [more-images...]
#
# - At least ONE evidence image is mandatory. The script refuses otherwise.
# - Any uncommitted evidence images are staged + committed before pushing.
# - Images are embedded inline in the PR body, pinned to the commit SHA so they
#   survive branch deletion after merge.

TITLE="${1:?Usage: create-pr.sh <title> <summary> <evidence-image> [more-images...]}"
SUMMARY="${2:-}"
shift 2 || true

if [ "$#" -lt 1 ]; then
  echo "❌ Refusing to create a PR without graphic evidence." >&2
  echo "   Provide at least one screenshot path (capture the affected screen at 375x667 first)." >&2
  echo "   See .claude/skills/create-pr/SKILL.md" >&2
  exit 1
fi

# Validate every image exists
IMAGES=()
for img in "$@"; do
  if [ ! -f "$img" ]; then
    echo "❌ Evidence image not found: $img" >&2
    exit 1
  fi
  IMAGES+=("$img")
done

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "❌ You are on '$BRANCH'. Create a feature branch before opening a PR." >&2
  exit 1
fi

# Determine the default base branch
BASE=$(git remote show origin 2>/dev/null | sed -n 's/.*HEAD branch: //p')
BASE="${BASE:-main}"

# Stage + commit any evidence images that aren't committed yet
git add "${IMAGES[@]}"
if ! git diff --cached --quiet; then
  git commit -q -m "docs(evidence): add graphic evidence for ${TITLE}

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
fi

# Push the branch
git push -q -u origin "$BRANCH"

# Resolve owner/repo and the pinned commit SHA for stable raw image URLs
SLUG=$(gh repo view --json nameWithOwner -q .nameWithOwner)
SHA=$(git rev-parse HEAD)

# Build the evidence markdown
EVIDENCE="## 📸 Evidencia gráfica (375×667 — iPhone SE)"$'\n'
for img in "${IMAGES[@]}"; do
  REL="${img#./}"
  URL="https://github.com/${SLUG}/raw/${SHA}/${REL}"
  CAPTION=$(basename "$REL")
  EVIDENCE+=$'\n'"**${CAPTION}**"$'\n\n'"<img src=\"${URL}\" width=\"375\" alt=\"${CAPTION}\" />"$'\n'
done

# Assemble the PR body
BODY="${SUMMARY}"$'\n\n'"${EVIDENCE}"$'\n'"🤖 Generated with [Claude Code](https://claude.com/claude-code)"

# Create the PR
PR_URL=$(gh pr create --title "$TITLE" --base "$BASE" --head "$BRANCH" --body "$BODY")
echo "✅ PR created with $# evidence image(s): $PR_URL"
