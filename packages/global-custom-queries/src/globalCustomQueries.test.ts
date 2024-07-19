import path from "node:path";
import { composeVisitors, transform } from "lightningcss";
import { expect, it } from "vitest";
import globalCustomQueries from "./globalCustomQueries";

it("should resolve custom queries", () => {
	const source = `
		@media (--breakpoint) {
			.foo {
				color: red;
			}
		}
	`;

	const result = "@media (width<=100em){.foo{color:red}}";

	const mockFile = path.join(__dirname, "./mocks/custom-media.css");

	const { code } = transform({
		filename: "test.css",
		code: Buffer.from(source),
		minify: true,
		visitor: composeVisitors([globalCustomQueries({ source: mockFile })]),
	});

	expect(code.toString()).toBe(result);
});

it("shouldn't resolve custom queries if custom media is not in the source file", () => {
	const source = `
		@media (--small-breakpoint) {
			.foo {
				color: red;
			}
		}
	`;

	const result = "@media (--small-breakpoint){.foo{color:red}}";

	const mockFile = path.join(__dirname, "./mocks/custom-media.css");

	const { code } = transform({
		filename: "test.css",
		code: Buffer.from(source),
		minify: true,
		visitor: composeVisitors([globalCustomQueries({ source: mockFile })]),
	});

	expect(code.toString()).toBe(result);
});

it("shouldn't replace media queries if the source file is empty", () => {
	const source = `
		@media (--breakpoint) {
			.foo {
				color: red;
			}
		}
	`;

	const result = "@media (--breakpoint){.foo{color:red}}";

	const mockFile = path.join(__dirname, "./mocks/no-custom-media.css");

	const { code } = transform({
		filename: "test.css",
		code: Buffer.from(source),
		minify: true,
		visitor: composeVisitors([globalCustomQueries({ source: mockFile })]),
	});

	expect(code.toString()).toBe(result);
});

it("should resolve custom queries with multiple media queries", () => {
	const source = `
		.foo {
			color: red;
			@media (--breakpoint) {
				color: blue;
			}
		}
		

		@media (--breakpoint) {
			.bar {
				color: blue;
			}
		}
	`;

	const result =
		".foo{color:red;@media (width<=100em){&{color:#00f}}}@media (width<=100em){.bar{color:#00f}}";

	const mockFile = path.join(__dirname, "./mocks/custom-media.css");

	const { code } = transform({
		filename: "test.css",
		code: Buffer.from(source),
		minify: true,
		visitor: composeVisitors([globalCustomQueries({ source: mockFile })]),
	});

	expect(code.toString()).toBe(result);
});

it("should throw an error if the custom media queries are not found", () => {
	const source = `
		@media (--breakpoint) {
			.foo {
				color: red;
			}
		}
	`;

	const mockFile = path.join(__dirname, "./mocks/no-file.css");

	expect(() =>
		transform({
			filename: "test.css",
			code: Buffer.from(source),
			minify: true,
			visitor: composeVisitors([globalCustomQueries({ source: mockFile })]),
		}),
	).toThrowError();
});
