import { composeVisitors, transform } from "lightningcss";
import { expect, it } from "vitest";
import globalComposes from "./globalComposes";

it("should inject class properties", () => {
	const source = `
		.foo {
			@composes bar;
		}
	`;

	const result = ".foo{color:red}";

	const { code } = transform({
		filename: "test.css",
		minify: true,
		code: Buffer.from(source),
		visitor: composeVisitors([
			globalComposes({ source: "./mocks/compose.css" }),
		]),
	});

	expect(code.toString()).toBe(result);
});

it("should inject class properties before existing properties", () => {
	const source = `
		.foo {
			margin: 10px;
			@composes bar;
		}
	`;

	const result = ".foo{color:red;margin:10px}";

	const { code } = transform({
		filename: "test.css",
		minify: true,
		code: Buffer.from(source),
		visitor: composeVisitors([
			globalComposes({ source: "./mocks/compose.css" }),
		]),
	});

	expect(code.toString()).toBe(result);
});

it("should inject multiple class properties", () => {
	const source = `
		.foo {
			@composes bar;
			@composes small;
		}
	`;

	const result = ".foo{color:red;font-size:12px}";

	const { code } = transform({
		filename: "test.css",
		minify: true,
		code: Buffer.from(source),
		visitor: composeVisitors([
			globalComposes({ source: "./mocks/compose.css" }),
		]),
	});

	expect(code.toString()).toBe(result);
});
