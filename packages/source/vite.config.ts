import { resolve } from "node:path";
import codspeedPlugin from "@codspeed/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [codspeedPlugin()],
	test: {
		coverage: {
			reporter: ["lcovonly", "text-summary"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.bench.ts"],
		},
		benchmark: {
			include: ["src/**/*.bench.ts"],
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
