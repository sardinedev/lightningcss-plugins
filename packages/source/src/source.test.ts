import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCssSource, resolveCssSource } from "./source";

const tokens = path.join(__dirname, "./mocks/tokens.css");
const missingTokens = path.join(__dirname, "./mocks/missing-tokens.css");
const ERROR_PREFIX = "[@sardine/lightningcss-plugin-source]:";

describe("createCssSource", () => {
	it("indexes custom media and custom properties in one source", () => {
		const source = createCssSource(tokens);

		expect(source.filename).toBe(tokens);
		expect(source.customMedia.has("--narrow")).toBe(true);
		expect(source.customProperties.has("--space-md")).toBe(true);
	});

	it("uses the last custom property declaration", () => {
		const source = createCssSource(tokens);
		const duplicate = source.customProperties.get("--duplicate");

		expect(duplicate).toEqual([{ type: "length", value: { unit: "px", value: 2 } }]);
	});

	it("reuses an existing source handle", () => {
		const source = createCssSource(tokens);

		expect(resolveCssSource(source)).toBe(source);
	});

	it("resolves a source filename", () => {
		expect(resolveCssSource(tokens).filename).toBe(tokens);
	});

	it("throws a branded error when the source cannot be read", () => {
		expect(() => createCssSource(missingTokens)).toThrowError(ERROR_PREFIX);
	});
});
