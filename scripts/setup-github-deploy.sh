#!/usr/bin/env bash
# One-time: GitHub Actions secrets for Cloudflare Pages deploys.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-6f4da5603c16bb38fe73935939b1a165}"
REPO="${GITHUB_REPOSITORY:-wattagebanks/tryon.rvw}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh && gh auth login"
  exit 1
fi

gh auth status >/dev/null

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Create a Cloudflare API token (Edit Cloudflare Workers / Pages):"
  echo "  https://dash.cloudflare.com/profile/api-tokens"
  echo "Then: export CLOUDFLARE_API_TOKEN='...'"
  exit 1
fi

gh secret set CLOUDFLARE_ACCOUNT_ID --body "$ACCOUNT_ID" -R "$REPO"
gh secret set CLOUDFLARE_API_TOKEN --body "$CLOUDFLARE_API_TOKEN" -R "$REPO"

echo "Secrets set on $REPO"
echo "Pushes to main → https://tryon-rvw.pages.dev"
echo "Feature branches → https://<branch>.tryon-rvw.pages.dev"
