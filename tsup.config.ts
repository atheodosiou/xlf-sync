import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/cli.ts"],
    format: ["esm"],
    target: "node20",
    sourcemap: true,
    dts: true,
    clean: true,
    splitting: false,
});
