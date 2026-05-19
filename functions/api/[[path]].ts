const ENGINE = "bria-rmbg";

const LOCAL_HINT =
  "Background removal runs locally with bria-rmbg. From the repo root, run: npm run dev";

function withCors(req: Request, res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", req.headers.get("Origin") ?? "*");
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
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

function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/api/")) return path.slice(4) || "/";
  if (path === "/api") return "/";
  return path;
}

export const onRequest: PagesFunction = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return withCors(request, new Response(null, { status: 204 }));
  }

  const path = normalizePath(new URL(request.url).pathname);

  if (request.method === "GET" && path === "/health") {
    return json(request, {
      status: "ok",
      engine: ENGINE,
      ready: false,
      hint: LOCAL_HINT,
    });
  }

  if (request.method === "POST" && path === "/remove-background") {
    return json(request, { detail: LOCAL_HINT }, 503);
  }

  return withCors(request, new Response("Not found", { status: 404 }));
};
