import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const BG_REMOVE_DEV_TARGET = "http://127.0.0.1:8788";
const PYTHON_DEV_TARGET = "http://127.0.0.1:8000";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const usePython = env.VITE_USE_PYTHON_API === "true";
  const bgTarget = env.VITE_BG_REMOVE_PROXY_TARGET || BG_REMOVE_DEV_TARGET;
  const apiTarget = usePython
    ? env.VITE_API_TARGET || PYTHON_DEV_TARGET
    : bgTarget;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          rewrite: usePython
            ? undefined
            : (path) => path.replace(/^\/api/, ""),
          configure: usePython
            ? undefined
            : (proxy) => {
                proxy.on("proxyReq", (proxyReq, req) => {
                  const host = req.headers.host;
                  if (host) {
                    proxyReq.setHeader("X-Forwarded-Host", host);
                    proxyReq.setHeader("X-Forwarded-Proto", "http");
                  }
                });
              },
        },
      },
    },
  };
});
