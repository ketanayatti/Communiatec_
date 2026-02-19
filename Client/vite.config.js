import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Manual chunk splitting ────────────────────────────────────────
// ONLY split out huge, self-contained libraries that load lazily.
// Everything else is left to Rollup's automatic chunking, which
// respects the module graph and avoids circular-import TDZ errors
// like "Cannot access 'S' before initialization".
//
// ⚠️  DO NOT add a catch-all "vendor-misc" — that was the root cause
//     of the production crash. Forcing unrelated packages into one
//     chunk breaks ES module initialization order.
// ────────────────────────────────────────────────────────────────────
const ISOLATED_CHUNKS = {
  "vendor-monaco": [
    "node_modules/monaco-editor",
    "node_modules/@monaco-editor",
  ],
  "vendor-three": ["node_modules/three", "node_modules/@react-three"],
  "vendor-emoji": ["node_modules/emoji-picker-react"],
};

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
    }),
    VitePWA({
      selfDestroying: true,
      devOptions: { enabled: false },
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
      ],
      workbox: {
        maximumFileSizeToCacheInBytes: 8_000_000,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Don't precache Monaco workers — they are huge and loaded on
        // demand only when the CodeEditor page is visited.
        globIgnores: [
          "**/ts.worker-*.js",
          "**/css.worker-*.js",
          "**/html.worker-*.js",
          "**/json.worker-*.js",
        ],
      },
      manifest: {
        name: "Communiatec",
        short_name: "Communiatec",
        description: "Real-time collaborative chat and code pairing",
        theme_color: "#0f172a",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512x512.png",
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
    dedupe: [
      "react",
      "react-dom",
      "@radix-ui/react-slot",
      "@radix-ui/react-primitive",
      "sonner",
      "use-sync-external-store",
      "zustand",
    ],
  },

  // ─── Build (Production) ────────────────────────────────────────────
  build: {
    // Monaco alone is ~4.3 MB minified – that's expected.
    // Set this high enough that no dependency can trigger a warning.
    chunkSizeWarningLimit: 5000,
    sourcemap: false,
    target: "es2015",
    cssCodeSplit: true,
    minify: "esbuild",
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      requireReturnsDefault: "auto",
    },
    rollupOptions: {
      output: {
        // Only split out truly huge, isolated libraries.
        // Everything else is auto-chunked by Rollup so the module
        // initialization order is always correct.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          for (const [chunkName, matchers] of Object.entries(ISOLATED_CHUNKS)) {
            if (matchers.some((m) => id.includes(m))) {
              return chunkName;
            }
          }

          // Let Rollup decide — no catch-all "vendor-misc"!
        },
      },
    },
  },

  // ─── Dev optimizeDeps ──────────────────────────────────────────────
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "socket.io-client",
      "sonner",
      "use-sync-external-store",
      "use-sync-external-store/shim",
      "use-sync-external-store/shim/with-selector",
      "zustand",
      "monaco-editor",
    ],
    exclude: [],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },

  define: {
    global: "globalThis",
  },

  // ─── Dev Server ─────────────────────────────────────────────────
  // Proxy /socket.io/ and /api/ to the backend so that sockets can
  // connect to window.location.origin in dev (same as prod/nginx).
  server: {
    proxy: {
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
