import path from "node:path";
import type { CustomAtRules, TransformOptions } from "lightningcss";
import { composeVisitors, transform } from "lightningcss";
import { describe, expect, it } from "vitest";
import globalCustomQueries from "./globalCustomQueries";

const BRANDED_ERROR_PREFIX = "[@sardine/lightningcss-plugin-global-custom-queries]:";

/** Run lightningcss transform with the common test defaults. */
function runTransform(source: string, options: Partial<TransformOptions<CustomAtRules>>) {
	return transform({
		filename: "test.css",
		minify: true,
		code: new TextEncoder().encode(source),
		...options,
	});
}

const customMediaFile = path.join(__dirname, "./mocks/custom-media.css");
const noCustomMediaFile = path.join(__dirname, "./mocks/no-custom-media.css");

describe("globalCustomQueries", () => {
	it("should resolve a known custom media query", () => {
		const source = `
			@media (--breakpoint) {
				.foo { color: red; }
			}
		`;
		const { code } = runTransform(source, {
			visitor: composeVisitors([globalCustomQueries({ source: customMediaFile })]),
		});
		expect(code.toString()).toBe("@media (width<=100em){.foo{color:red}}");
	});

	it("should leave an unknown custom media query unchanged", () => {
		const source = `
			@media (--small-breakpoint) {
				.foo { color: red; }
			}
		`;
		// --small-breakpoint is not defined in custom-media.css
		const { code } = runTransform(source, {
			visitor: composeVisitors([globalCustomQueries({ source: customMediaFile })]),
		});
		expect(code.toString()).toBe("@media (--small-breakpoint){.foo{color:red}}");
	});

	it("should leave custom media queries unchanged when the source file is empty", () => {
		const source = `
			@media (--breakpoint) {
				.foo { color: red; }
			}
		`;
		const { code } = runTransform(source, {
			visitor: composeVisitors([globalCustomQueries({ source: noCustomMediaFile })]),
		});
		expect(code.toString()).toBe("@media (--breakpoint){.foo{color:red}}");
	});

	it("should resolve the same custom query used multiple times", () => {
		const source = `
			.foo {
				color: red;
				@media (--breakpoint) { color: blue; }
			}
			@media (--breakpoint) {
				.bar { color: blue; }
			}
		`;
		const { code } = runTransform(source, {
			visitor: composeVisitors([globalCustomQueries({ source: customMediaFile })]),
		});
		expect(code.toString()).toBe(
			".foo{color:red;@media (width<=100em){color:#00f}}@media (width<=100em){.bar{color:#00f}}",
		);
	});

	it("should resolve multiple distinct custom queries in a single pass", () => {
		const source = `
			@media (--breakpoint) {
				.small { color: red; }
			}
			@media (--large-breakpoint) {
				.large { color: blue; }
			}
		`;
		const { code } = runTransform(source, {
			visitor: composeVisitors([globalCustomQueries({ source: customMediaFile })]),
		});
		expect(code.toString()).toBe("@media (width<=100em){.small{color:red}}@media (width>=120em){.large{color:#00f}}");
	});

	it("should resolve a custom query that is the sole condition alongside a media type", () => {
		// mediaType (e.g. "screen") is stored separately from condition in the AST,
		// so query.condition.type is still "feature" and the plugin resolves it.
		const { code } = runTransform("@media screen and (--breakpoint) { .a { color: red } }", {
			visitor: composeVisitors([globalCustomQueries({ source: customMediaFile })]),
		});
		expect(code.toString()).toBe("@media screen and (width<=100em){.a{color:red}}");
	});

	it("should throw a branded error when the source file does not exist", () => {
		const source = `
			@media (--breakpoint) {
				.foo { color: red; }
			}
		`;
		const missingFile = path.join(__dirname, "./mocks/no-file.css");
		expect(() =>
			runTransform(source, {
				visitor: composeVisitors([globalCustomQueries({ source: missingFile })]),
			}),
		).toThrowError(BRANDED_ERROR_PREFIX);
	});

	it("should resolve a negated custom query", () => {
		const { code } = runTransform("@media not (--breakpoint) { .a { color: red } }", {
			visitor: composeVisitors([globalCustomQueries({ source: customMediaFile })]),
		});
		// LightningCSS simplifies `not (width<=100em)` → `(width>100em)` when minifying
		expect(code.toString()).toBe("@media (width>100em){.a{color:red}}");
	});

	it("should resolve a custom query inside an AND compound condition", () => {
		const { code } = runTransform("@media (--breakpoint) and (color) { .a { color: red } }", {
			visitor: composeVisitors([globalCustomQueries({ source: customMediaFile })]),
		});
		expect(code.toString()).toBe("@media (width<=100em) and (color){.a{color:red}}");
	});

	it("passes through a plain media-type query unchanged", () => {
		const { code } = runTransform("@media print { .a { color: red } }", {
			visitor: composeVisitors([globalCustomQueries({ source: customMediaFile })]),
		});
		expect(code.toString()).toBe("@media print{.a{color:red}}");
	});
});
