import assert from "node:assert/strict";
import { it, describe } from "node:test";
import { composeVisitors, transform } from "lightningcss";
import urlComposer from "./urlComposer.js";

describe("urlComposer", () => {
	it("should replace the url", () => {
		const res = transform({
			minify: true,
			code: Buffer.from("body { background: url(${URL}/logo.svg); }"),
			visitor: composeVisitors([urlComposer({ URL: "https://sardine.dev" })]),
		});

		const actual = res.code.toString();
		const expected = "body{background:url(https://sardine.dev/logo.svg)}";

		assert.strictEqual(
			actual,
			expected,
			`Expected ${actual} to be ${expected}`,
		);
	});

	it("should replace the url with multiple keys", () => {
		const res = transform({
			minify: true,
			code: Buffer.from(
				"body { background: url(${URL}/${VERSION}/logo.svg); }",
			),
			visitor: composeVisitors([
				urlComposer({ URL: "https://sardine.dev", VERSION: "v1" }),
			]),
		});

		const actual = res.code.toString();
		const expected = "body{background:url(https://sardine.dev/v1/logo.svg)}";

		assert.strictEqual(
			actual,
			expected,
			`Expected ${actual} to be ${expected}`,
		);
	});

	it("shouldn't replace the url if the case doesn't match", () => {
		const res = transform({
			minify: true,
			code: Buffer.from("body { background: url(${URL}/logo.svg); }"),
			visitor: composeVisitors([urlComposer({ url: "https://sardine.dev" })]),
		});

		const actual = res.code.toString();
		const expected = "body{background:url(${URL}/logo.svg)}";

		assert.strictEqual(
			actual,
			expected,
			`Expected ${actual} to be ${expected}`,
		);
	});
});
