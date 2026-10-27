import path from "node:path";
import { stripNullValues } from "@sardine/lightningcss-plugin-utils";
import { describe, expect, it, vi } from "vitest";
import { createCssSource, resolveCssSource } from "./source";

vi.mock("@sardine/lightningcss-plugin-utils", async (importOriginal) => {
	const utils = await importOriginal<typeof import("@sardine/lightningcss-plugin-utils")>();
	return { ...utils, stripNullValues: vi.fn(utils.stripNullValues) };
});

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

	it("indexes global classes by name", () => {
		const source = createCssSource(tokens);

		expect(source.classes.get("theme")).toEqual({
			declarations: [
				{
					property: "custom",
					value: { name: "--duplicate", value: [{ type: "length", value: { unit: "px", value: 2 } }] },
				},
			],
			importantDeclarations: [],
		});
	});

	it("only sanitises declarations of rules that contain a class", () => {
		vi.mocked(stripNullValues).mockClear();
		createCssSource(tokens);

		const blocks = vi
			.mocked(stripNullValues)
			.mock.calls.filter(([value]) => typeof value === "object" && value !== null && "declarations" in value);
		expect(blocks).toHaveLength(1);
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

	it("keeps the Lightning CSS error as the cause", () => {
		expect(() => createCssSource(missingTokens)).toThrowError(
			expect.objectContaining({ cause: expect.objectContaining({ message: expect.any(String) }) }),
		);
	});
});
