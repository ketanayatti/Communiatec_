import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Vendor chunking map ───────────────────────────────────────────
// Each key is a chunk name, each value is an array of package-name
// substrings to match.  When you add a BIG new dependency in the
// future, just add a new entry here — the build will never surprise
// you with a bloated chunk again.
// ────────────────────────────────────────────────────────────────────
const VENDOR_CHUNKS = {
  // ── Core React (no external deps) ──
  "vendor-react": [
    "node_modules/react/",
    "node_modules/react-dom/",
    "node_modules/react-router",
    "node_modules/scheduler",
  ],

  // ── Monaco Editor (huge, loads lazily) ──
  "vendor-monaco": [
    "node_modules/monaco-editor",
    "node_modules/@monaco-editor",
  ],

  // ── Three.js (huge, loads lazily) ──
  "vendor-three": [
    "node_modules/three",
    "node_modules/@react-three",
  ],

  // ── Radix + Sonner + UI utility libs ──
  // CRITICAL: sonner depends on @radix-ui internals, and class-variance-authority /
  // clsx / tailwind-merge are used alongside Radix everywhere. They MUST stay in the
  // same chunk to avoid circular cross-chunk imports at runtime.
  "vendor-ui": [
    "node_modules/@radix-ui",
    "node_modules/sonner",
    "node_modules/class-variance-authority",
    "node_modules/clsx",
    "node_modules/tailwind-merge",
    "node_modules/@emotion/is-prop-valid",
    "node_modules/next-themes",
    "node_modules/lucide-react",
    "node_modules/react-icons",
    "node_modules/@heroicons",
  ],

  // ── Animation (framer-motion, GSAP, react-spring) ──
  "vendor-animation": [
    "node_modules/framer-motion",
    "node_modules/@react-spring",
    "node_modules/gsap",
  ],

  // ── Charts ──
  "vendor-charts": [
    "node_modules/recharts",
    "node_modules/d3-",
    "node_modules/d3/",
  ],

  // ── Emoji picker (large, rarely loaded) ──
  "vendor-emoji": ["node_modules/emoji-picker-react"],

  // ── Socket.IO ──
  "vendor-socket": ["node_modules/socket.io"],

  // ── State & data libs ──
  "vendor-data": [
    "node_modules/zustand",
    "node_modules/use-sync-external-store",
    "node_modules/axios",
    "node_modules/date-fns",
    "node_modules/moment",
  ],
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
        globIgnores: ["**/ts.worker-*.js", "**/css.worker-*.js", "**/html.worker-*.js", "**/json.worker-*.js"],
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
        // Future-proof chunking: any new dependency you install will
        // either match a named chunk above or fall into "vendor-misc".
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          for (const [chunkName, matchers] of Object.entries(VENDOR_CHUNKS)) {
            if (matchers.some((m) => id.includes(m))) {
              return chunkName;
            }
          }

          // Everything else from node_modules goes here
          return "vendor-misc";
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
});
