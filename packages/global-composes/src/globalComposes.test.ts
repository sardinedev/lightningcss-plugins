import path from "node:path";
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

	const mockPath = path.join(__dirname, "./mocks/compose.css");

	const { code } = transform({
		filename: "test.css",
		minify: true,
		code: new TextEncoder().encode(source),
		visitor: composeVisitors([globalComposes({ source: mockPath })]),
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

	const mockPath = path.join(__dirname, "./mocks/compose.css");

	const { code } = transform({
		filename: "test.css",
		minify: true,
		code: new TextEncoder().encode(source),
		visitor: composeVisitors([globalComposes({ source: mockPath })]),
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

	const mockPath = path.join(__dirname, "./mocks/compose.css");

	const { code } = transform({
		filename: "test.css",
		minify: true,
		code: new TextEncoder().encode(source),
		visitor: composeVisitors([globalComposes({ source: mockPath })]),
	});

	expect(code.toString()).toBe(result);
});
