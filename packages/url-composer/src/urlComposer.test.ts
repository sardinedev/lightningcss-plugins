import { composeVisitors, transform } from "lightningcss";
import { describe, expect, it } from "vitest";
import urlComposer from "./urlComposer";

const runTransform = (source: string, mapping: Record<string, string>) =>
	transform({
		filename: "test.css",
		minify: true,
		code: new TextEncoder().encode(source),
		visitor: composeVisitors([urlComposer(mapping)]),
	}).code.toString();

describe("urlComposer", () => {
	it("should replace the url", () => {
		const actual = runTransform("body { background: url(${URL}/logo.svg); }", {
			URL: "https://sardine.dev",
		});

		expect(actual).toBe("body{background:url(https://sardine.dev/logo.svg)}");
	});

	it("should replace the url with multiple keys", () => {
		const actual = runTransform("body { background: url(${URL}/${VERSION}/logo.svg); }", {
			URL: "https://sardine.dev",
			VERSION: "v1",
		});

		expect(actual).toBe("body{background:url(https://sardine.dev/v1/logo.svg)}");
	});

	it("shouldn't replace the url if the case doesn't match", () => {
		const actual = runTransform("body { background: url(${URL}/logo.svg); }", {
			url: "https://sardine.dev",
		});

		expect(actual).toBe("body{background:url(${URL}/logo.svg)}");
	});

	it("should not modify a url that contains no placeholders", () => {
		const actual = runTransform("body { background: url(https://sardine.dev/logo.svg); }", {
			URL: "https://sardine.dev",
		});

		expect(actual).toBe("body{background:url(https://sardine.dev/logo.svg)}");
	});

	it("should not modify a url when the mapping is empty", () => {
		const actual = runTransform("body { background: url(${URL}/logo.svg); }", {});

		expect(actual).toBe("body{background:url(${URL}/logo.svg)}");
	});

	it("should replace placeholders across multiple url() declarations", () => {
		const actual = runTransform(
			"body { background: url(${URL}/logo.svg); } .icon { background: url(${URL}/icon.png); }",
			{
				URL: "https://sardine.dev",
			},
		);

		expect(actual).toBe(
			"body{background:url(https://sardine.dev/logo.svg)}.icon{background:url(https://sardine.dev/icon.png)}",
		);
	});

	it("should replace all occurrences of the same key within a single url", () => {
		const actual = runTransform("body { background: url(${CDN}/${VERSION}/assets/${VERSION}/logo.svg); }", {
			CDN: "https://cdn.sardine.dev",
			VERSION: "v1",
		});

		expect(actual).toBe("body{background:url(https://cdn.sardine.dev/v1/assets/v1/logo.svg)}");
	});

	it("should replace a placeholder with an empty string value", () => {
		const actual = runTransform("body { background: url(${PREFIX}/logo.svg); }", {
			PREFIX: "",
		});

		expect(actual).toBe("body{background:url(/logo.svg)}");
	});

	it("should replace placeholders in @font-face src", () => {
		const actual = runTransform("@font-face { src: url(${CDN}/font.woff2); }", {
			CDN: "https://cdn.sardine.dev",
		});

		expect(actual).toBe("@font-face{src:url(https://cdn.sardine.dev/font.woff2)}");
	});

	it("should replace placeholders when the source uses quoted url syntax", () => {
		const actual = runTransform('body { background: url("${URL}/logo.svg"); }', {
			URL: "https://sardine.dev",
		});

		expect(actual).toBe("body{background:url(https://sardine.dev/logo.svg)}");
	});

	it("should not replace placeholders inside @import url()", () => {
		// @import urls are represented as plain strings by lightningcss, not as
		// Url values, so the Url visitor is never called for them.
		const actual = runTransform("@import url(${URL}/style.css);", {
			URL: "https://sardine.dev",
		});

		expect(actual).toBe('@import "${URL}/style.css";');
	});
});
