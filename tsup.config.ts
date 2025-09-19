import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    target: "es2022",
    shims: true
  },
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: true,
    minify: false,
    target: "es2022",
    shims: true,
    banner: {
      js: "#!/usr/bin/env node"
    }
  }
])