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

Repo: **[github.com/wattagebanks/tryon.rvw](https://github.com/wattagebanks/tryon.rvw)**

### Option A — Connect Git in Cloudflare (recommended)

Cloudflare only allows Git integration if the project is created **from Git**, not after a CLI upload.

1. Open **[Create Pages project → Connect to Git](https://dash.cloudflare.com/6f4da5603c16bb38fe73935939b1a165/pages/new/connect)** (account: `averyjaffe1@gmail.com`).
2. Authorize **GitHub** if prompted, then select **`wattagebanks/tryon.rvw`**.
3. **Set up builds and deployments**:

   | Setting | Value |
   |---------|--------|
   | Project name | `tryon-rvw` |
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | `npm ci && npm run build` |
   | Build output directory | `frontend/dist` |
   | Root directory | `/` (repo root) |

4. **Environment variables** (Settings → Variables) — add before or after first deploy:

   | Name | Type | Value |
   |------|------|--------|
   | `LITELLM_API_KEY` | Secret | your LiteLLM key |
   | `LITELLM_BASE_URL` | Plain | `https://litellm.irltechnology.com` |
   | `LITELLM_MODEL_GPT_IMAGE` | Plain | `gpt-image-1` |
   | `LITELLM_MODEL_DALLE3` | Plain | `dall-e-3` |

5. Save and deploy. Pushes to `main` update production; other branches get preview URLs like `https://<branch>.tryon-rvw.pages.dev`.

**Do not** run `wrangler pages deploy` on this project if you use Git integration — Cloudflare does not allow switching from Direct Upload to Git later.

### Option B — GitHub Actions (if you skip dashboard Git)

Add repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (`6f4da5603c16bb38fe73935939b1a165`).

Every push runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) and deploys with branch previews.

### Manual CLI deploy (Direct Upload only)

```bash
npm run deploy
```

Creates/recreates a **Direct Upload** project — cannot add Git integration afterward.

## API

`POST /api/remove-background`

- `file` — image (multipart)
- `model` — `gpt-image` or `dall-e-3`

`GET /api/health` — configuration status.

## Architecture

- **Frontend**: React + Vite → Cloudflare Pages static assets
- **API**: Pages Functions in [`functions/api/[[path]].ts`](functions/api/[[path]].ts) (same code as [`workers/bg-remove`](workers/bg-remove) for local dev)
