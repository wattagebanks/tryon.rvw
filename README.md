# tryon.rvw

Pixelcut-style background remover: upload an image, remove the background via your [LiteLLM](https://litellm.irltechnology.com) proxy, and download an **opaque PNG** on a solid white background (no transparency).

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

## Deploy (Cloudflare Pages)

Every push to GitHub deploys via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

| Branch | URL |
|--------|-----|
| `main` | `https://tryon-rvw.pages.dev` (production) |
| Feature branch | `https://<branch>.tryon-rvw.pages.dev` (preview) |

### One-time setup

1. **GitHub repository secrets** (Settings → Secrets → Actions):

   - `CLOUDFLARE_API_TOKEN` — API token with **Cloudflare Pages Edit** permission
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID

2. **Cloudflare Pages environment variables** (Workers & Pages → **tryon-rvw** → Settings → Variables):

   | Name | Type | Example |
   |------|------|---------|
   | `LITELLM_API_KEY` | Secret | your LiteLLM key |
   | `LITELLM_BASE_URL` | Plain | `https://litellm.irltechnology.com` |
   | `LITELLM_MODEL_GPT_IMAGE` | Plain | `gpt-image-1` |
   | `LITELLM_MODEL_DALLE3` | Plain | `dall-e-3` |

   Plaintext vars are already in [`wrangler.jsonc`](wrangler.jsonc); override in the dashboard if your proxy uses different model names.

3. Create the Pages project (first deploy):

   ```bash
   npm run deploy
   ```

### Manual deploy

```bash
npm run deploy
# Preview branch:
wrangler pages deploy frontend/dist --project-name=tryon-rvw --branch=my-feature
```

## API

`POST /api/remove-background`

- `file` — image (multipart)
- `model` — `gpt-image` or `dall-e-3`
- `background_color` — hex (production: white only)

`GET /api/health` — configuration status.

## Architecture

- **Frontend**: React + Vite → Cloudflare Pages static assets
- **API**: Pages Functions in [`functions/api/[[path]].ts`](functions/api/[[path]].ts) (same code as [`workers/bg-remove`](workers/bg-remove) for local dev)
