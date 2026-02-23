import path from "node:path";
import type { CustomAtRules, TransformOptions } from "lightningcss";
import { composeVisitors, transform } from "lightningcss";
import { describe, expect, it } from "vitest";
import globalComposes, { globalComposesCustomAtRules } from "./globalComposes";

const mocks = {
	compose: path.join(__dirname, "./mocks/compose.css"),
	composeWithVar: path.join(__dirname, "./mocks/compose-with-var.css"),
	stress: path.join(__dirname, "./mocks/stress.css"),
};

/** Run lightningcss transform with the common test defaults. */
function runTransform<C extends CustomAtRules = CustomAtRules>(source: string, options: Partial<TransformOptions<C>>) {
	return transform({
		filename: "test.css",
		minify: true,
		code: new TextEncoder().encode(source),
		...options,
	});
}

describe("basic composition", () => {
	it("should inject class properties", () => {
		const { code } = runTransform(`.foo { @composes bar; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe(".foo{color:red}");
	});

	it("should inject class properties before existing properties", () => {
		const { code } = runTransform(`.foo { margin: 10px; @composes bar; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe(".foo{color:red;margin:10px}");
	});

	it("should inject multiple class properties", () => {
		const { code } = runTransform(`.foo { @composes bar; @composes small; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe(".foo{color:red;font-size:12px}");
	});
});

describe("customAtRules configuration", () => {
	it("should not emit warnings about unknown at rule @composes", () => {
		const { code, warnings } = runTransform(`.foo { @composes bar; }`, {
			customAtRules: { ...globalComposesCustomAtRules },
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(warnings).toHaveLength(0);
		expect(code.toString()).toBe(".foo{color:red}");
	});
});

describe("edge cases and regressions", () => {
	it("should be a no-op when the composed class does not exist in the source", () => {
		// Referencing an unknown class name must not throw — the @composes rule is
		// silently consumed and any other declarations on the rule are preserved.
		const { code } = runTransform(`.foo { @composes nonexistent; color: blue; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe(".foo{color:#00f}");
	});

	it("should throw a descriptive error when the source file does not exist", () => {
		expect(() => globalComposes({ source: "/nonexistent/path/missing.css" })).toThrow(
			"[@sardine/lightningcss-plugin-global-composes]",
		);
	});

	it("should compose declarations into rules with multiple selectors", () => {
		// A selector list (.foo, .bar) is a single Rule — composition must apply
		// to both selectors simultaneously.
		const { code } = runTransform(`.foo, .bar { @composes bar; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe(".foo,.bar{color:red}");
	});

	it("should handle files with url function", () => {
		const { code } = runTransform(`.foo { background-image: url(./image.svg); @composes bar; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe(".foo{color:red;background-image:url(./image.svg)}");
	});

	it("should handle files with @import url() at the top level", () => {
		// Reproduces an error with files that open with @import url()
		// caused a lightningcss deserialisation error in lightningcss ≥1.30.2:
		//   "failed to deserialize; expected an object-like struct named Specifier, found ()"
		const source = `
			@import url("./base.css");
			.foo { @composes bar; }
		`;

		const { code } = runTransform(source, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		// @import is not resolved by transform(), so it should be preserved as a
		// plain string specifier (lightningcss drops the url() wrapper when minifying);
		// the @composes substitution must still apply alongside it
		expect(code.toString()).toContain('@import "./base.css"');
		expect(code.toString()).toContain(".foo{color:red}");
	});

	it("should compose classes whose declarations contain var()", () => {
		// Reproduces the core lightningcss >=1.30.2 bug where AST nodes captured via bundle()
		// contain null fields (e.g. DashedIdentReference.from, Variable.fallback) that
		// lightningcss cannot deserialise back when they are returned from a *different*
		// visitor call during transform().
		// See: https://github.com/parcel-bundler/lightningcss/issues/1081
		const { code } = runTransform(`.foo { @composes bar-with-var; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.composeWithVar })]),
		});

		expect(code.toString()).toContain(".foo{color:var(--brand-color)}");
	});

	it("should preserve !important declarations from the composed class", () => {
		// DeclarationBlock has two arrays: `declarations` and `importantDeclarations`.
		// The injection must copy both, otherwise !important properties are silently dropped.
		const { code } = runTransform(`.foo { @composes important-bar; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe(".foo{color:red!important}");
	});

	it("should compose declarations when @composes is inside @media", () => {
		// The Rule.style visitor is invoked recursively for style rules nested inside
		// @media / @supports blocks — the substitution must still apply.
		const { code } = runTransform(`@media (min-width: 600px) { .foo { @composes bar; } }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe("@media (width>=600px){.foo{color:red}}");
	});
});

describe("performance", () => {
	it("should handle many classes efficiently (stress test)", () => {
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

		const { code } = runTransform(source, {
			visitor: composeVisitors([globalComposes({ source: mocks.stress })]),
		});

		expect(code.toString()).toBe(
			".composed{visibility:visible;cursor:pointer;grid-row:20;gap:30px;height:10px;margin:1px}",
		);
	});
});
