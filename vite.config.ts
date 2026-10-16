import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function localApiDevPlugin(): Plugin {
  return {
    name: "local-api-dev-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/api/deleteAccount" && req.method === "POST") {
          try {
            const chunks: any[] = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            const bodyBuffer = Buffer.concat(chunks);
            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) {
              if (v) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
            }

            const origin = `http://${req.headers.host || "localhost:5173"}`;
            const webRequest = new Request(`${origin}${req.url}`, {
              method: "POST",
              headers,
              body: bodyBuffer.length > 0 ? bodyBuffer : undefined,
            });

            const mod = await server.ssrLoadModule("/api/deleteAccount.ts");
            const webResponse = await mod.POST(webRequest);

            res.statusCode = webResponse.status;
            webResponse.headers.forEach((val: string, key: string) => {
              res.setHeader(key, val);
            });
            const text = await webResponse.text();
            res.end(text);
          } catch (err: any) {
            console.error("[localApiDevPlugin] /api/deleteAccount error:", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ error: err?.message || "Internal Dev Server Error" })
            );
          }
          return;
        }

        if (req.url === "/api/uploadBanner" && req.method === "POST") {
          try {
            const chunks: any[] = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            const bodyBuffer = Buffer.concat(chunks);
            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) {
              if (v) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
            }

            const origin = `http://${req.headers.host || "localhost:5173"}`;
            const webRequest = new Request(`${origin}${req.url}`, {
              method: "POST",
              headers,
              body: bodyBuffer.length > 0 ? bodyBuffer : undefined,
            });

            const mod = await server.ssrLoadModule("/api/uploadBanner.ts");
            const webResponse = await mod.POST(webRequest);

            res.statusCode = webResponse.status;
            webResponse.headers.forEach((val: string, key: string) => {
              res.setHeader(key, val);
            });
            const text = await webResponse.text();
            res.end(text);
          } catch (err: any) {
            console.error("[localApiDevPlugin] /api/uploadBanner error:", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ error: err?.message || "Internal Dev Server Error" })
            );
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [
      localApiDevPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          navigateFallbackDenylist: [/^\/api/],
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          runtimeCaching: [
            {
              urlPattern: /^\/units\/.*\.webp$/,
              handler: "CacheFirst",
              options: {
                cacheName: "unit-images-cache",
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          name: "ASTD Value List & Trading Platform",
          short_name: "ASTD Values",
          description:
            "Official community-driven value list, trade calculator, and market analytics for All Star Tower Defense.",
          theme_color: "#2B2D31",
          background_color: "#313338",
          display: "standalone",
          icons: [
            {
              src: "/favicon-32x32.png",
              sizes: "32x32",
              type: "image/png",
            },
            {
              src: "/icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: "esnext",
      minify: "esbuild",
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom"],
            "icons-vendor": ["lucide-react"],
          },
        },
      },
    },
  };
});