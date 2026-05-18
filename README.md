# tryon.rvw

Pixelcut-style background remover: upload an image, remove the background via your [LiteLLM](https://litellm.irltechnology.com) proxy, and download a **transparent PNG**.

Models in the UI:

- **GPT Image** (`gpt-image-1` by default)
- **DALL-E 3** (`dall-e-3` by default)

Model IDs must match what your LiteLLM proxy exposes.

## Local development

1. Copy Worker / Pages secrets for local Wrangler:

   ```bash
   cp workers/bg-remove/.dev.vars.example workers/bg-remove/.dev.vars
   # Edit LITELLM_API_KEY (and model names if your proxy uses different IDs)
   ```

2. Install and run (Vite + API Worker):

   ```bash
   npm install
   npm run dev
   ```

3. Open **http://localhost:5173**

Vite proxies `/api` → `http://127.0.0.1:8788` (Wrangler dev).

### Local rembg (optional, no LiteLLM cost)

```bash
npm run dev:rembg
```

Uses Python + U2-Net in `backend/` (best cutouts for dev).

## Deploy (Cloudflare Pages + GitHub)

| | |
|---|---|
| **GitHub** | [github.com/wattagebanks/tryon.rvw](https://github.com/wattagebanks/tryon.rvw) |
| **Pages project** | `tryon-rvw` ([dashboard](https://dash.cloudflare.com/6f4da5603c16bb38fe73935939b1a165/pages/view/tryon-rvw)) |
| **Production URL** | [https://tryon-rvw.pages.dev](https://tryon-rvw.pages.dev) |
| **Feature branches** | `https://<branch>.tryon-rvw.pages.dev` (slashes in branch names become hyphens) |

Cloudflare Pages project names must be **lowercase letters, numbers, and dashes only** — so the deployment slug is **`tryon-rvw`** (same pattern as `archive.rvw` → `archive-rvw`). You can attach a custom domain such as **tryon.rvw** under Pages → Custom domains.

### Automatic deploy on push

Every push runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

- **`main`** → production at `tryon-rvw.pages.dev`
- **Any other branch** → preview at `<branch>.tryon-rvw.pages.dev`

Repository secrets (already configured on this repo): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

To rotate the API token:

```bash
export CLOUDFLARE_API_TOKEN='...'   # from https://dash.cloudflare.com/profile/api-tokens
./scripts/setup-github-deploy.sh
```

Prefer a dedicated **API token** (not a Wrangler OAuth token) for Actions — OAuth secrets expire when you re-login to Wrangler.

### Pages secrets (API)

```bash
npx wrangler pages secret put LITELLM_API_KEY --project-name=tryon-rvw
```

Plain-text vars are in [`wrangler.jsonc`](wrangler.jsonc) (`LITELLM_BASE_URL`, model IDs).

### Manual CLI deploy

```bash
npm run deploy
```

Deploys the current build with Wrangler (same project as CI).

## API

`POST /api/remove-background`

- `file` — image (multipart)
- `model` — `gpt-image` or `dall-e-3`

`GET /api/health` — configuration status.

## Architecture

- **Frontend**: React + Vite → Cloudflare Pages static assets
- **API**: Pages Functions in [`functions/api/[[path]].ts`](functions/api/[[path]].ts) (same code as [`workers/bg-remove`](workers/bg-remove) for local dev)
