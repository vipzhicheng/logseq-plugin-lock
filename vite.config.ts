import { defineConfig } from "vite";
import logseqPlugin from "vite-plugin-logseq";
import inject from "@rollup/plugin-inject";
import nodePolyfills from "rollup-plugin-node-polyfills";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      stream: "rollup-plugin-node-polyfills/polyfills/stream",
      crypto: "crypto-browserify",
    },
  },
  build: {
    target: "esnext",
    // sourcemap: true,
    // minify: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1024,

    rollupOptions: {
      plugins: [
        nodePolyfills({ crypto: true }),
        inject({
          Buffer: ["buffer", "Buffer"],
          stream: ["stream-browserify"],
          crypto: ["crypto-browserify"],
        }),
      ],
      output: {
        manualChunks: {
          logseq: ["@logseq/libs"],
          stegcloak: ["stegcloak"],
        },
      },
    },
  },

  plugins: [logseqPlugin()],
});
