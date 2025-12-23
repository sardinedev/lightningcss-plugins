import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
export default defineConfig({
	test: {
		coverage: {
			reporter: ["lcovonly", "text-summary"],
			include: ["src/**/*.ts"],
		},
		benchmark: {
			include: ["src/**/*.bench.ts"],
		},
	},
	build: {
		minify: false,
		target: "node20",
		lib: {
			entry: resolve(__dirname, "src/globalComposes.ts"),
			formats: ["es"],
			fileName: "globalComposes",
		},
		rollupOptions: {
			// make sure to externalize deps that shouldn't be bundled
			external: ["lightningcss", "node:path"],
		},
	},
});
