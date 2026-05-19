# tryon.rvw — Background Remover

Pixelcut-style background removal: upload an image, get a **transparent PNG** with real alpha (no checkerboard baked into the file — like an Apple sticker).

Uses **bria-rmbg** locally via [rembg](https://github.com/danielgatis/rembg).

## Quick start

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd ..
npm install
npm run dev
```

Open **http://localhost:5173**, drop an image, download the cutout.

If `npm run dev` fails with “address already in use”, stop leftover dev servers:

```bash
npm run dev:stop
npm run dev
```

First run downloads the bria-rmbg model (~170 MB) into `~/.u2net/` — later runs are faster.

## API

`POST /api/remove-background` — multipart field `file` (JPEG, PNG, WebP, GIF, BMP; max 15 MB).

Returns `image/png` with transparency.

`GET /api/health` — `{ "status": "ok", "engine": "bria-rmbg", "ready": true }`

## Stack

- **Frontend**: React + Vite
- **Backend**: FastAPI + rembg (`bria-rmbg`)

Vite proxies `/api` → `http://127.0.0.1:8000` during `npm run dev`.
