import { describe, expect, it } from "vitest";
import { stripNullValues } from "./index";

describe("stripNullValues", () => {
	it("returns null as-is", () => {
		expect(stripNullValues(null)).toBeNull();
	});

	it("returns undefined as-is", () => {
		expect(stripNullValues(undefined)).toBeUndefined();
	});

	it("passes primitive strings through unchanged", () => {
		expect(stripNullValues("hello")).toBe("hello");
	});

	it("passes primitive numbers through unchanged", () => {
		expect(stripNullValues(42)).toBe(42);
	});

	it("passes booleans through unchanged", () => {
		expect(stripNullValues(true)).toBe(true);
		expect(stripNullValues(false)).toBe(false);
	});

	it("removes null-valued keys from a flat object", () => {
		const input = { a: 1, b: null, c: "x" };
		expect(stripNullValues(input)).toEqual({ a: 1, c: "x" });
	});

	it("keeps keys whose value is 0, false, or empty string", () => {
		const input = { a: 0, b: false, c: "", d: null };
		expect(stripNullValues(input)).toEqual({ a: 0, b: false, c: "" });
	});

	it("removes null-valued keys deep in a nested object", () => {
		const input = { outer: { inner: null, keep: "yes" } };
		expect(stripNullValues(input)).toEqual({ outer: { keep: "yes" } });
	});

	it("recursively strips nulls at multiple nesting levels", () => {
		const input = { a: { b: { c: null, d: 1 }, e: null }, f: 2 };
		expect(stripNullValues(input)).toEqual({ a: { b: { d: 1 } }, f: 2 });
	});

	it("processes array elements recursively", () => {
		const input = [
			{ a: 1, b: null },
			{ c: null, d: 2 },
		];
		expect(stripNullValues(input)).toEqual([{ a: 1 }, { d: 2 }]);
	});

	it("handles arrays nested inside objects", () => {
		const input = {
			items: [
				{ x: null, y: 1 },
				{ x: 2, y: null },
			],
		};
		expect(stripNullValues(input)).toEqual({ items: [{ y: 1 }, { x: 2 }] });
	});

	it("handles objects nested inside arrays", () => {
		const input = [{ nested: { a: null, b: "keep" } }];
		expect(stripNullValues(input)).toEqual([{ nested: { b: "keep" } }]);
	});

	it("does not mutate the original object", () => {
		const input = { a: 1, b: null };
		const copy = { ...input };
		stripNullValues(input);
		expect(input).toEqual(copy);
	});

	it("returns an empty object when all keys are null", () => {
		expect(stripNullValues({ a: null, b: null })).toEqual({});
	});

	it("passes through an empty object unchanged", () => {
		expect(stripNullValues({})).toEqual({});
	});

	it("passes through an empty array unchanged", () => {
		expect(stripNullValues([])).toEqual([]);
	});
});
