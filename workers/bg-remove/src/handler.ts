export interface Env {
  LITELLM_BASE_URL: string;
  LITELLM_API_KEY: string;
  LITELLM_MODEL: string;
  LITELLM_MODEL_DALLE3?: string;
  LITELLM_MODEL_GPT_IMAGE?: string;
  BG_REMOVE_SECRET?: string;
}

export const MAX_BYTES = 15 * 1024 * 1024;
export const ALLOWED_PREFIX = "image/";

export const REMOVE_BG_PROMPT =
  "Remove the entire background from this image. " +
  "Keep only the main subject with sharp, accurate edges. " +
  "Do not alter the subject's appearance, colors, or proportions. " +
  "Place the subject on a solid pure white background (#FFFFFF). " +
  "No transparency, no checkerboard, no gradients, no shadows on the background.";

export const MODEL_OPTIONS = {
  "gpt-image": {
    label: "GPT Image",
    envKey: "LITELLM_MODEL_GPT_IMAGE" as const,
    fallback: "gpt-image-1",
  },
  "dall-e-3": {
    label: "DALL-E 3",
    envKey: "LITELLM_MODEL_DALLE3" as const,
    fallback: "dall-e-3",
  },
} as const;

export type ModelChoice = keyof typeof MODEL_OPTIONS;

function withCors(req: Request, res: Response): Response {
  const headers = new Headers(res.headers);
  const allow = req.headers.get("Origin") ?? "*";
  headers.set("Access-Control-Allow-Origin", allow);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(res.body, { status: res.status, headers });
}

function json(req: Request, body: unknown, status = 200): Response {
  return withCors(
    req,
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }),
  );
}

function litellmEditsUrl(base: string): string {
  const trimmed = base.replace(/\/$/, "");
  return trimmed.endsWith("/v1")
    ? `${trimmed}/images/edits`
    : `${trimmed}/v1/images/edits`;
}

export function parseHexColor(hex: string): [number, number, number] | null {
  let value = hex.trim().replace(/^#/, "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

export function resolveModel(env: Env, choice: string | null): string {
  const defaultModel = env.LITELLM_MODEL?.trim() || "gpt-image-1";

  if (choice === "dall-e-3") {
    return (
      env.LITELLM_MODEL_DALLE3?.trim() ||
      MODEL_OPTIONS["dall-e-3"].fallback
    );
  }
  if (choice === "gpt-image") {
    return (
      env.LITELLM_MODEL_GPT_IMAGE?.trim() ||
      MODEL_OPTIONS["gpt-image"].fallback
    );
  }
  return defaultModel;
}

async function callLiteLLM(
  env: Env,
  imageBytes: ArrayBuffer,
  mime: string,
  model: string,
): Promise<ArrayBuffer> {
  const base = env.LITELLM_BASE_URL?.trim();
  const key = env.LITELLM_API_KEY?.trim();

  if (!base || !key) {
    throw new Error(
      "LiteLLM is not configured (LITELLM_BASE_URL, LITELLM_API_KEY).",
    );
  }

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", REMOVE_BG_PROMPT);
  form.append("n", "1");
  form.append("size", "1024x1024");
  form.append("response_format", "b64_json");
  form.append(
    "image",
    new Blob([imageBytes], { type: mime || "image/png" }),
    "input.png",
  );

  const res = await fetch(litellmEditsUrl(base), {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LiteLLM error ${res.status}: ${text.slice(0, 400)}`);
  }

  const payload = (await res.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const item = payload.data?.[0];
  if (!item) throw new Error("LiteLLM returned no image data");

  if (item.b64_json) {
    const binary = atob(item.b64_json);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  if (item.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) throw new Error("Failed to fetch LiteLLM image URL");
    return imgRes.arrayBuffer();
  }

  throw new Error("LiteLLM response missing b64_json or url");
}

function checkAuth(req: Request, env: Env): Response | null {
  if (!env.BG_REMOVE_SECRET) return null;
  const auth = req.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token !== env.BG_REMOVE_SECRET) {
    return json(req, { error: "Unauthorized" }, 401);
  }
  return null;
}

function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/api/")) return path.slice(4) || "/";
  if (path === "/api") return "/";
  return path;
}

export async function handleRequest(
  req: Request,
  env: Env,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return withCors(req, new Response(null, { status: 204 }));
  }

  const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  if (req.method === "GET" && path === "/health") {
    const litellmReady = Boolean(
      env.LITELLM_BASE_URL?.trim() && env.LITELLM_API_KEY?.trim(),
    );
    const defaultModel = env.LITELLM_MODEL?.trim() || "gpt-image-1";
    return json(req, {
      status: "ok",
      runtime: "cloudflare",
      providers: {
        litellm: {
          available: litellmReady,
          model: defaultModel,
          label: "LiteLLM",
          models: {
            "gpt-image": {
              id: resolveModel(env, "gpt-image"),
              label: MODEL_OPTIONS["gpt-image"].label,
            },
            "dall-e-3": {
              id: resolveModel(env, "dall-e-3"),
              label: MODEL_OPTIONS["dall-e-3"].label,
            },
          },
        },
        local: {
          available: false,
          label: "Local rembg (Python only — npm run dev:rembg)",
        },
      },
      default_provider: "litellm",
      default_model: "gpt-image",
    });
  }

  if (req.method !== "POST" || path !== "/remove-background") {
    return withCors(req, new Response("Not found", { status: 404 }));
  }

  const unauthorized = checkAuth(req, env);
  if (unauthorized) return unauthorized;

  const rawCt = req.headers.get("Content-Type") ?? "";
  if (!rawCt.toLowerCase().includes("multipart/form-data")) {
    return json(req, { error: "Expected multipart/form-data" }, 400);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json(req, { error: "Invalid multipart body" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json(req, { error: "Missing file field" }, 400);
  }

  if (!file.type.startsWith(ALLOWED_PREFIX)) {
    return json(req, { error: "File must be an image" }, 400);
  }

  if (file.size > MAX_BYTES) {
    return json(req, { error: "File too large (max 15MB)" }, 413);
  }

  const bgRaw = form.get("background_color");
  const bgHex = typeof bgRaw === "string" ? bgRaw : "#ffffff";
  if (parseHexColor(bgHex) === null) {
    return json(req, { error: `Invalid hex color: ${bgHex}` }, 400);
  }

  if (bgHex.toLowerCase() !== "#ffffff" && bgHex.toLowerCase() !== "#fff") {
    return json(
      req,
      {
        error:
          "Custom background colors are only supported via local rembg (npm run dev:rembg). Production uses a white background.",
      },
      400,
    );
  }

  const modelRaw = form.get("model");
  const modelChoice =
    typeof modelRaw === "string" && modelRaw.trim() ? modelRaw.trim() : null;
  const litellmModel = resolveModel(env, modelChoice);

  try {
    const bytes = await file.arrayBuffer();
    const result = await callLiteLLM(env, bytes, file.type, litellmModel);
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return withCors(
      req,
      new Response(result, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${baseName}-no-bg.png"`,
          "X-LiteLLM-Model": litellmModel,
        },
      }),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Processing failed";
    return json(req, { detail: message }, 500);
  }
}
