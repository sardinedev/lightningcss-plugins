import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
export default defineConfig({
	test: {
		coverage: {
			reporter: ["lcovonly", "text-summary"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.bench.ts"],
		},
	},
	build: {
		minify: false,
		target: "node20",
		lib: {
			entry: resolve(__dirname, "src/cssModulesTypes.ts"),
			formats: ["es"],
			fileName: "cssModulesTypes",
		},
		rollupOptions: {
			// make sure to externalize deps that shouldn't be bundled
			external: ["lightningcss", "node:fs", "node:path"],
		},
	},
});
