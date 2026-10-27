import type { SelectorList } from "lightningcss";
import { describe, expect, it } from "vitest";
import { formatSelectors, UNKNOWN_SELECTOR } from "./formatSelectors";

describe("formatSelectors", () => {
	it("should print common selectors without Lightning CSS", () => {
		expect(formatSelectors([[{ type: "class", name: "foo" }], [{ type: "id", name: "bar" }]])).toBe(".foo, #bar");
	});

	it("should fall back to Lightning CSS for components the JS printer leaves to it", () => {
		expect(formatSelectors([[{ type: "pseudo-element", kind: "webkit-scrollbar", value: "thumb" }]])).toBe(
			"::-webkit-scrollbar-thumb",
		);
	});

	it("should return a placeholder instead of throwing when no printer understands the AST", () => {
		// `languages` is missing, so the JS printer throws and Lightning CSS cannot deserialize it.
		const malformed = [[{ type: "pseudo-class", kind: "lang" }]] as unknown as SelectorList;

		expect(formatSelectors(malformed)).toBe(UNKNOWN_SELECTOR);
	});
});
