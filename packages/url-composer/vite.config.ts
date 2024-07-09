import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	test: {
		coverage: {
			reporter: ["lcovonly", "text-summary"],
			include: ["src/**/*.ts"],
		},
	},
	build: {
		minify: false,
		lib: {
			entry: resolve(__dirname, "src/urlComposer.ts"),
			formats: ["es"],
			fileName: "urlComposer",
		},
	},
});
