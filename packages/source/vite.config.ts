import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			reporter: ["lcovonly", "text-summary"],
			include: ["src/**/*.ts"],
		},
	},
	build: {
		minify: false,
		target: "node20",
		lib: {
			entry: resolve(__dirname, "src/source.ts"),
			formats: ["es"],
			fileName: "source",
		},
		rollupOptions: {
			external: ["lightningcss"],
		},
	},
});
