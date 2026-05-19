#!/usr/bin/env bash
# Attach tryon.redfordvanwyatt.com to the tryon-rvw Pages project (DNS + Pages custom domain).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-6f4da5603c16bb38fe73935939b1a165}"
PROJECT="tryon-rvw"
DOMAIN="tryon.redfordvanwyatt.com"
ZONE_NAME="redfordvanwyatt.com"
CNAME_TARGET="tryon-rvw.pages.dev"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Set CLOUDFLARE_API_TOKEN with Zone DNS Edit for ${ZONE_NAME} and Account Pages Edit."
  echo "  https://dash.cloudflare.com/profile/api-tokens"
  exit 1
fi

auth=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

zone_id="$(curl -fsS "${auth[@]}" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["result"][0]["id"])')"

# Pages custom domain (idempotent)
existing="$(curl -fsS "${auth[@]}" \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/domains" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(any(x['name']=='${DOMAIN}' for x in d.get('result',[])))")"

if [ "$existing" != "True" ]; then
  curl -fsS -X POST "${auth[@]}" \
    "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/domains" \
    --data "{\"name\":\"${DOMAIN}\"}" >/dev/null
  echo "Added Pages custom domain: ${DOMAIN}"
else
  echo "Pages custom domain already registered: ${DOMAIN}"
fi

# CNAME tryon -> tryon-rvw.pages.dev (proxied)
record_id="$(curl -fsS "${auth[@]}" \
  "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records?type=CNAME&name=tryon.${ZONE_NAME}" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result",[]); print(r[0]["id"] if r else "")' || true)"

if [ -n "$record_id" ]; then
  curl -fsS -X PATCH "${auth[@]}" \
    "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}" \
    --data "{\"type\":\"CNAME\",\"name\":\"tryon\",\"content\":\"${CNAME_TARGET}\",\"proxied\":true}" >/dev/null
  echo "Updated DNS CNAME: tryon -> ${CNAME_TARGET}"
else
  curl -fsS -X POST "${auth[@]}" \
    "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records" \
    --data "{\"type\":\"CNAME\",\"name\":\"tryon\",\"content\":\"${CNAME_TARGET}\",\"proxied\":true}" >/dev/null
  echo "Created DNS CNAME: tryon -> ${CNAME_TARGET}"
fi

echo "Done. SSL may take a few minutes; then https://${DOMAIN}"
