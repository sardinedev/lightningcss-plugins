import { composeVisitors, transform } from "lightningcss";
import { expect, it } from "vitest";
import urlComposer from "./urlComposer";

it("should replace the url", () => {
	const res = transform({
		filename: "test.css",
		minify: true,
		code: Buffer.from("body { background: url(${URL}/logo.svg); }"),
		visitor: composeVisitors([urlComposer({ URL: "https://sardine.dev" })]),
	});

	const actual = res.code.toString();
	const expected = "body{background:url(https://sardine.dev/logo.svg)}";

	expect(actual).toBe(expected);
});

it("should replace the url with multiple keys", () => {
	const res = transform({
		filename: "test.css",
		minify: true,
		code: Buffer.from("body { background: url(${URL}/${VERSION}/logo.svg); }"),
		visitor: composeVisitors([
			urlComposer({ URL: "https://sardine.dev", VERSION: "v1" }),
		]),
	});

	const actual = res.code.toString();
	const expected = "body{background:url(https://sardine.dev/v1/logo.svg)}";

	expect(actual).toBe(expected);
});

it("shouldn't replace the url if the case doesn't match", () => {
	const res = transform({
		filename: "test.css",
		minify: true,
		code: Buffer.from("body { background: url(${URL}/logo.svg); }"),
		visitor: composeVisitors([urlComposer({ url: "https://sardine.dev" })]),
	});

	const actual = res.code.toString();
	const expected = "body{background:url(${URL}/logo.svg)}";

	expect(actual).toBe(expected);
});
