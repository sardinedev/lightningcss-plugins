import path from "node:path";
import { composeVisitors, transform } from "lightningcss";
import { describe, expect, it } from "vitest";
import globalComposes, { globalComposesCustomAtRules } from "./globalComposes";

describe("basic composition", () => {
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
});

describe("customAtRules configuration", () => {
	it("should work with customAtRules configuration", () => {
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
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: mockPath })]),
		});

		expect(code.toString()).toBe(result);
	});

	it("should not emit warnings about unknown at rule @composes", () => {
		const source = `
			.foo {
				@composes bar;
			}
		`;

		const mockPath = path.join(__dirname, "./mocks/compose.css");

		const { warnings } = transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: mockPath })]),
		});

		expect(warnings).toHaveLength(0);
	});

	it("should inject multiple class properties with customAtRules", () => {
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
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: mockPath })]),
		});

		expect(code.toString()).toBe(result);
	});
});

describe("edge cases and regressions", () => {
	it("should handle files with url function", () => {
		const source = `
			.foo {
				background-image: url(./image.svg);
				@composes bar;
			}
		`;

		const result = ".foo{color:red;background-image:url(./image.svg)}";

		const mockPath = path.join(__dirname, "./mocks/compose.css");

		const { code } = transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			visitor: composeVisitors([globalComposes({ source: mockPath })]),
		});

		expect(code.toString()).toBe(result);
	});

	it("should handle files with @import url() at the top level", () => {
		// Reproduces an error with files that open with @import url()
		// caused a lightningcss deserialisation error in 1.31:
		//   "failed to deserialize; expected an object-like struct named Specifier, found ()"
		const source = `
			@import url("./base.css");
			.foo {
				@composes bar;
			}
		`;

		const mockPath = path.join(__dirname, "./mocks/compose.css");

		const { code } = transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			visitor: composeVisitors([globalComposes({ source: mockPath })]),
		});

		// @import is not resolved by transform(), so it should be preserved;
		// the @composes substitution must still apply
		expect(code.toString()).toContain(".foo{color:red}");
	});

	it("should compose classes whose declarations contain var()", () => {
		// Reproduces the core lightningcss >=1.30.2 bug where AST nodes captured via bundle()
		// contain null fields (e.g. DashedIdentReference.from, Variable.fallback) that
		// lightningcss cannot deserialise back when they are returned from a *different*
		// visitor call during transform().
		// See: https://github.com/parcel-bundler/lightningcss/issues/1081
		const source = `
			.foo {
				@composes bar-with-var;
			}
		`;

		const mockPath = path.join(__dirname, "./mocks/compose-with-var.css");

		const { code } = transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			visitor: composeVisitors([globalComposes({ source: mockPath })]),
		});

		expect(code.toString()).toContain(".foo{color:var(--brand-color)}");
	});
});

describe("performance", () => {
	it("should handle many classes efficiently (stress test)", () => {
		// Create a source that composes many classes from a large global file
		const source = `
			.composed {
				@composes class1;
				@composes class10;
				@composes class20;
				@composes class30;
				@composes class40;
				@composes class50;
			}
		`;

		// Expected result should contain all composed class declarations (order may vary due to minification)
		const result = ".composed{visibility:visible;cursor:pointer;grid-row:20;gap:30px;height:10px;margin:1px}";

		const mockPath = path.join(__dirname, "./mocks/stress.css");

		const { code } = transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			visitor: composeVisitors([globalComposes({ source: mockPath })]),
		});

		expect(code.toString()).toBe(result);
	});
});
