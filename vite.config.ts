// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * The dev-only TanStack devtools plugin injects `data-tsd-source="..."` on every
 * JSX element. React Three Fiber's `applyProps` cannot set dashed props on
 * three.js objects and throws ("Cannot set data-tsd-source"), blanking the scene.
 * Strip the attribute again in files that render three.js elements.
 */
function stripDevtoolsSourceFromR3F(): Plugin {
  return {
    name: "strip-tsd-source-from-r3f",
    apply: "serve",
    enforce: "post",
    transform(code, id) {
      if (id.includes("node_modules")) return null;
      if (!code.includes("data-tsd-source")) return null;
      if (
        !/@react-three\/(fiber|drei|postprocessing)/.test(code) &&
        !/\/components\/game\//.test(id)
      ) {
        return null;
      }
      const next = code.replace(/\s*"data-tsd-source":\s*"[^"]*",?/g, "");
      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  plugins: [stripDevtoolsSourceFromR3F()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
