import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  server: {
    port: 5009,
    strictPort: true,
    proxy: {
      "/api/anthropic": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        rewrite: (path) => path.replace("/api/anthropic", ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const forwardedKey = req.headers["x-forwarded-api-key"];
            if (forwardedKey) {
              proxyReq.setHeader("x-api-key", forwardedKey);
              proxyReq.removeHeader("x-forwarded-api-key");
            }
            proxyReq.setHeader("anthropic-version", "2023-06-01");
            proxyReq.removeHeader("origin");
          });
        },
      },
    },
  },
});
