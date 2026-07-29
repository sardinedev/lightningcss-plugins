import path from "node:path";
import type { CustomAtRules, TransformOptions } from "lightningcss";
import { composeVisitors, transform } from "lightningcss";
import { describe, expect, it } from "vitest";
import customPropertyFallback from "./customPropertyFallback";

const tokens = path.join(__dirname, "./mocks/tokens.css");
const missingTokens = path.join(__dirname, "./mocks/missing-tokens.css");
const ERROR_PREFIX = "[@sardine/lightningcss-plugin-custom-property-fallback]:";

/** Run lightningcss transform with the common test defaults. */
function runTransform<C extends CustomAtRules = CustomAtRules>(source: string, options: Partial<TransformOptions<C>>) {
	return transform({
		filename: "test.css",
		minify: true,
		code: new TextEncoder().encode(source),
		...options,
	});
}

describe("adds fallback values for custom properties", () => {
	it("should add fallback values for custom properties", () => {
		const { code } = runTransform(`.foo { margin-right: var(--space-md); }`, {
			visitor: composeVisitors([customPropertyFallback({ source: tokens })]),
		});

		expect(code.toString()).toBe(".foo{margin-right:var(--space-md,16px)}");
	});

	it("adds fallbacks to multiple variables", () => {
		const { code } = runTransform(`.foo { margin: var(--space-sm) var(--space-md); }`, {
			visitor: composeVisitors([customPropertyFallback({ source: tokens })]),
		});

		expect(code.toString()).toBe(".foo{margin:var(--space-sm,8px) var(--space-md,16px)}");
	});

	it("preserves compound source values", () => {
		const { code } = runTransform(`.foo { box-shadow: var(--card-shadow); }`, {
			visitor: composeVisitors([customPropertyFallback({ source: tokens })]),
		});

		expect(code.toString()).toBe(".foo{box-shadow:var(--card-shadow,0 1px 4px #0003)}");
	});

	it("preserves nested variables in source values", () => {
		const { code } = runTransform(`.foo { padding: var(--content-spacing); }`, {
			visitor: composeVisitors([customPropertyFallback({ source: tokens })]),
		});

		expect(code.toString()).toBe(".foo{padding:var(--content-spacing,var(--space-sm) 24px)}");
	});

	it("leaves unknown variables unchanged", () => {
		const { code } = runTransform(`.foo { padding: var(--unknown); }`, {
			visitor: composeVisitors([customPropertyFallback({ source: tokens })]),
		});

		expect(code.toString()).toBe(".foo{padding:var(--unknown)}");
	});

	it("preserves existing fallbacks", () => {
		const { code } = runTransform(`.foo { padding: var(--space-md, 32px); }`, {
			visitor: composeVisitors([customPropertyFallback({ source: tokens })]),
		});

		expect(code.toString()).toBe(".foo{padding:var(--space-md,32px)}");
	});

	it("uses the last source declaration across selectors", () => {
		const { code } = runTransform(`.foo { padding: var(--duplicate); }`, {
			visitor: composeVisitors([customPropertyFallback({ source: tokens })]),
		});

		expect(code.toString()).toBe(".foo{padding:var(--duplicate,2px)}");
	});

	it("throws a branded error when the source file cannot be read", () => {
		expect(() => customPropertyFallback({ source: missingTokens })).toThrowError(ERROR_PREFIX);
	});
});
