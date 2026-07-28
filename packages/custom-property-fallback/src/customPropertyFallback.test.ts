import path from "node:path";
import { composeVisitors, transform } from "lightningcss";
import { describe, expect, it } from "vitest";
import customPropertyFallback from "./customPropertyFallback";

const tokens = path.join(__dirname, "./mocks/tokens.css");

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

		expect(code.toString()).toBe(".foo{margin-right:var(--space-md, 16px);}");
	});
});
