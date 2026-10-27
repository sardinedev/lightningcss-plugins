import console from "node:console";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCssSource } from "@sardine/lightningcss-plugin-source";
import type { CustomAtRules, TransformOptions } from "lightningcss";
import { bundleAsync, composeVisitors, transform } from "lightningcss";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import globalCustomQueries from "../../global-custom-queries/src/globalCustomQueries";
import globalComposes, { globalComposesCustomAtRules } from "./globalComposes";

// Wrap `transform` in a pass-through spy so tests can count how often Lightning CSS
// runs, including any nested transform started by the plugin itself.
vi.mock("lightningcss", async (importOriginal) => {
	const lightningcss = await importOriginal<typeof import("lightningcss")>();
	return { ...lightningcss, transform: vi.fn(lightningcss.transform) };
});

const mocks = {
	compose: path.join(__dirname, "./mocks/compose.css"),
	composeWithVar: path.join(__dirname, "./mocks/compose-with-var.css"),
	overlay: path.join(__dirname, "./mocks/compose-overlay.css"),
	stress: path.join(__dirname, "./mocks/stress.css"),
};

afterEach(() => {
	vi.restoreAllMocks();
});

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

describe("multiple sources", () => {
	it("should compose classes from every source file", () => {
		const { code } = runTransform(`.foo { @composes bar; } .other { @composes bar-with-var; }`, {
			visitor: composeVisitors([globalComposes({ source: [mocks.compose, mocks.composeWithVar] })]),
		});

		expect(code.toString()).toBe(".foo{color:red}.other{color:var(--brand-color)}");
	});

	it("should accept a single source in an array", () => {
		const { code } = runTransform(`.foo { @composes bar; }`, {
			visitor: globalComposes({ source: [mocks.compose] }),
		});

		expect(code.toString()).toBe(".foo{color:red}");
	});

	it.each([
		[[mocks.compose, mocks.overlay], ".foo{background-color:#00f}"],
		[[mocks.overlay, mocks.compose], ".foo{color:red}"],
	] as const)("should replace the whole class using source order %j", (sources, expected) => {
		const { code } = runTransform(`.foo { @composes bar; }`, {
			visitor: globalComposes({ source: sources }),
		});

		expect(code.toString()).toBe(expected);
	});

	it.each([
		[[mocks.compose, mocks.overlay], ".foo{color:#00f}"],
		[[mocks.overlay, mocks.compose], ".foo{color:red!important}"],
	] as const)("should replace important declarations using source order %j", (sources, expected) => {
		const { code } = runTransform(`.foo { @composes important-bar; }`, {
			visitor: globalComposes({ source: sources }),
		});

		expect(code.toString()).toBe(expected);
	});

	it("should name the missing file in an array", () => {
		const missing = "/nonexistent/path/missing.css";

		expect(() => globalComposes({ source: [mocks.compose, missing] })).toThrow(missing);
	});

	it("should name a later invalid source and preserve its parser error", () => {
		const invalid = path.join(__dirname, "../package.json");
		const createVisitor = () => globalComposes({ source: [mocks.compose, invalid] });

		expect(createVisitor).toThrow(`[@sardine/lightningcss-plugin-global-composes]: Failed to load "${invalid}":`);
		expect(createVisitor).toThrow("Invalid empty selector");
		expect(createVisitor).toThrow(
			expect.objectContaining({
				cause: expect.objectContaining({ fileName: invalid, loc: { line: 1, column: 1 } }),
			}),
		);
	});

	it.each([
		["undefined", undefined],
		["a handle without classes", { filename: "old.css", customMedia: new Map(), customProperties: new Map() }],
		["an array with a handle without classes", [mocks.compose, { filename: "old.css" }]],
	])("should reject %s with a plugin error", (_label, source) => {
		expect(() => globalComposes({ source: source as never })).toThrow(
			'[@sardine/lightningcss-plugin-global-composes]: Invalid source: expected a CSS file path or a handle from createCssSource() with a "classes" index.',
		);
	});

	it("should accept an empty array without changing rules that do not compose", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const { code } = runTransform(`.foo { color: blue; }`, {
			visitor: globalComposes({ source: [] }),
		});

		expect(code.toString()).toBe(".foo{color:#00f}");
		expect(warn).not.toHaveBeenCalled();
	});
});

describe("shared source handles", () => {
	it("should compose classes from a source handle", () => {
		const { code } = runTransform(`.foo { @composes bar important-bar; }`, {
			visitor: globalComposes({ source: createCssSource(mocks.compose) }),
		});

		expect(code.toString()).toBe(".foo{color:red;color:red!important}");
	});

	it("should accept handles whose classes index is any ReadonlyMap", () => {
		const classes = new Map(createCssSource(mocks.compose).classes);
		// A ReadonlyMap that is not a Map instance, such as one from another realm or a lazy wrapper.
		const readonlyMap = {
			get: vi.fn((name: string) => classes.get(name)),
			[Symbol.iterator]: () => classes[Symbol.iterator](),
		};
		const handle = { classes: readonlyMap } as never;

		const single = runTransform(`.foo { @composes bar; }`, { visitor: globalComposes({ source: handle }) });
		expect(single.code.toString()).toBe(".foo{color:red}");
		// A single source is looked up directly instead of being copied.
		expect(readonlyMap.get).toHaveBeenCalledWith("bar");

		readonlyMap.get.mockClear();
		const merged = runTransform(`.foo { @composes bar overlay; }`, {
			visitor: globalComposes({ source: [handle, mocks.overlay] }),
		});
		expect(merged.code.toString()).toBe(".foo{background-color:#00f;font-weight:700}");
		expect(readonlyMap.get).not.toHaveBeenCalled();
	});

	it("should merge paths and handles in source order", () => {
		const compose = createCssSource(mocks.compose);
		const handleFirst = runTransform(`.foo { @composes bar; }`, {
			visitor: globalComposes({ source: [compose, mocks.overlay] }),
		});
		const pathFirst = runTransform(`.foo { @composes bar; }`, {
			visitor: globalComposes({ source: [mocks.overlay, compose] }),
		});

		expect(handleFirst.code.toString()).toBe(".foo{background-color:#00f}");
		expect(pathFirst.code.toString()).toBe(".foo{color:red}");
	});

	it("should share one parsed source with another plugin", () => {
		const directory = mkdtempSync(path.join(tmpdir(), "lightningcss-plugin-global-composes-"));
		const filename = path.join(directory, "globals.css");

		try {
			writeFileSync(filename, "@custom-media --narrow (width <= 40rem); .bar { color: red; }");
			const source = createCssSource(filename);
			rmSync(filename);

			const { code } = runTransform("@media (--narrow) { .foo { @composes bar; } }", {
				visitor: composeVisitors([globalCustomQueries({ source }), globalComposes({ source })]),
			});

			expect(code.toString()).toBe("@media (width<=40rem){.foo{color:red}}");
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});

describe("composition order", () => {
	it.each([false, true])("should let later names in one @composes win with customAtRules=%s", (configured) => {
		const options = configured ? { customAtRules: globalComposesCustomAtRules } : {};
		const visitor = globalComposes({ source: mocks.compose });

		expect(runTransform(`.foo { @composes bar blue; }`, { ...options, visitor }).code.toString()).toBe(
			".foo{color:#00f}",
		);
		expect(runTransform(`.foo { @composes blue bar; }`, { ...options, visitor }).code.toString()).toBe(
			".foo{color:red}",
		);
	});

	it.each([
		["@composes bar; @composes blue;", ".foo{color:#00f}"],
		["@composes blue; @composes bar;", ".foo{color:red}"],
	])("should let a later @composes win in %s", (rules, expected) => {
		const { code } = runTransform(`.foo { ${rules} }`, {
			visitor: globalComposes({ source: mocks.compose }),
		});

		expect(code.toString()).toBe(expected);
	});

	it.each([
		["important-bar important-blue", ".foo{color:#00f!important}"],
		["important-blue important-bar", ".foo{color:red!important}"],
	])("should apply the same order to !important declarations in @composes %s", (names, expected) => {
		const { code } = runTransform(`.foo { @composes ${names}; }`, {
			visitor: globalComposes({ source: mocks.compose }),
		});

		expect(code.toString()).toBe(expected);
	});

	it("should let composed !important declarations override the rule's own declarations", () => {
		const { code } = runTransform(`.foo { color: green; @composes important-bar; }`, {
			visitor: globalComposes({ source: mocks.compose }),
		});

		expect(code.toString()).toBe(".foo{color:green;color:red!important}");
	});

	it("should keep the rule's own declarations over composed ones", () => {
		const { code } = runTransform(`.foo { color: green; @composes bar blue; }`, {
			visitor: globalComposes({ source: mocks.compose }),
		});

		expect(code.toString()).toBe(".foo{color:green}");
	});
});

describe("unresolved classes", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	it.each([false, true])("should warn for unresolved names with customAtRules=%s", (configured) => {
		const { code, warnings } = runTransform(`.button--small { @composes label-sm-bold; color: blue; }`, {
			...(configured ? { customAtRules: globalComposesCustomAtRules } : {}),
			visitor: globalComposes({ source: mocks.compose }),
		});

		expect(code.toString()).toBe(".button--small{color:#00f}");
		expect(console.warn).toHaveBeenCalledExactlyOnceWith(
			'[@sardine/lightningcss-plugin-global-composes]: class "label-sm-bold" not found in source (composed in ".button--small" at line 1, column 18)',
		);
		if (configured) {
			expect(warnings).toHaveLength(0);
		}
	});

	it("should print one-based lines and columns in the warning", () => {
		runTransform(`.foo { color: red; }\n\n  .bar {\n    @composes missing;\n  }`, {
			visitor: globalComposes({ source: mocks.compose }),
		});

		expect(console.warn).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining('(composed in ".bar" at line 4, column 5)'),
		);
	});

	it.each([false, true])("should still compose resolved names with customAtRules=%s", (configured) => {
		const { code } = runTransform(`.foo { @composes bar missing overlay; }`, {
			...(configured ? { customAtRules: globalComposesCustomAtRules } : {}),
			visitor: globalComposes({ source: [mocks.compose, mocks.overlay] }),
		});

		expect(code.toString()).toContain("background-color:#00f");
		expect(code.toString()).toContain("font-weight:700");
		expect(console.warn).toHaveBeenCalledTimes(1);
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('class "missing"'));
	});

	it("should not warn when all names exist in any source", () => {
		runTransform(`.foo { @composes small overlay; }`, {
			visitor: globalComposes({ source: [mocks.compose, mocks.overlay] }),
		});

		expect(console.warn).not.toHaveBeenCalled();
	});

	it("should report once per missing name per consuming rule", () => {
		const onUnresolved = vi.fn();
		runTransform(`.foo { @composes missing missing other; @composes missing; }\n.bar { @composes missing; }`, {
			visitor: globalComposes({ source: mocks.compose, onUnresolved }),
		});

		expect(onUnresolved.mock.calls.map(([{ name, loc }]) => [name, loc.line])).toEqual([
			["missing", 0],
			["other", 0],
			["missing", 1],
		]);
	});

	it("should pass the name, selector and location to onUnresolved instead of warning", () => {
		const onUnresolved = vi.fn();
		const { code } = runTransform(`main { color: red; }\n.foo, .bar:hover { @composes missing; color: red; }`, {
			visitor: globalComposes({ source: mocks.compose, onUnresolved }),
		});

		expect(code.toString()).toBe("main{color:red}.foo,.bar:hover{color:red}");
		expect(console.warn).not.toHaveBeenCalled();
		expect(onUnresolved).toHaveBeenCalledExactlyOnceWith({
			name: "missing",
			selector: ".foo, .bar:hover",
			loc: { source_index: 0, line: 1, column: 20 },
		});
	});

	it.each([
		".button--small",
		".foo, .bar",
		"main > .foo:hover",
		"a + b ~ c d",
		"*, *|a, |b, #id.md\\:flex",
		".\\31 0, .-\\32 x, .--custom, .\\-",
		'[data-value="{"], [href^="http" s], [lang|=en i], [*|title], [data-x="a\\"b"]',
		".foo:is(.bar, .baz):not(.qux):where(&):has(> img, + p, img)",
		":nth-child(2n+1 of .a), :nth-child(2n), :nth-last-child(-n+3), :nth-of-type(3n-1), :nth-col(5), :nth-child(n)",
		":host, :host(.dark), ::slotted(span), ::part(label icon)",
		":lang(en, fr), :dir(rtl), :state(checked)",
		"a::before, a::after, p::first-line, ::selection, ::placeholder, ::highlight(search), ::cue(b), ::cue-region(b)",
		'.a\\1 b, [data-x="a\\1 b"]',
		"input:focus-visible, :popover-open, :fullscreen",
		// Printed by the Lightning CSS fallback.
		"::-webkit-scrollbar-thumb, :-webkit-full-screen, ::-moz-selection",
		":--custom, :--fn(a b), ::view-transition-group(root)",
	])("should print the selector %s like Lightning CSS", (selector) => {
		const suffix = " {\n  color: red;\n}\n";
		const expected = runTransform(`${selector} { color: red; }`, { minify: false })
			.code.toString()
			.slice(0, -suffix.length);
		const onUnresolved = vi.fn();
		runTransform(`${selector} { @composes missing; color: red; }`, {
			visitor: globalComposes({ source: mocks.compose, onUnresolved }),
		});

		expect(onUnresolved).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ selector: expected }));
	});

	it.each([
		["a:is(.b)", "a:is(.b)"],
		[":nth-child(1):hover", ":nth-child(1):hover"],
		// Printed by the Lightning CSS fallback, which simplifies the selector.
		[":-webkit-full-screen:is(.b)", ":-webkit-full-screen.b"],
	])("should report %s as %s", (input, printed) => {
		const onUnresolved = vi.fn();
		runTransform(`${input} { @composes missing; }`, {
			visitor: globalComposes({ source: mocks.compose, onUnresolved }),
		});

		expect(onUnresolved).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ selector: printed }));
	});

	it("should name the bundled file when the rule comes from an import", async () => {
		const files: Record<string, string> = {
			"/project/entry.css": '@import "button.css";\n.entry { @composes missing; }',
			"/project/button.css": "\n.button { @composes missing; }",
		};
		await bundleAsync({
			filename: "/project/entry.css",
			resolver: { read: (file) => files[file] ?? "", resolve: (specifier) => `/project/${specifier}` },
			visitor: globalComposes({ source: mocks.compose }),
		});

		expect(console.warn).toHaveBeenCalledTimes(2);
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('(composed in ".button" at line 2, column 11 of bundled file 1)'),
		);
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('(composed in ".entry" at line 2, column 10)'));
	});

	it("should print namespace prefixes", () => {
		const onUnresolved = vi.fn();
		runTransform(`@namespace svg url(http://www.w3.org/2000/svg); svg|a, [svg|href] { @composes missing; }`, {
			visitor: globalComposes({ source: mocks.compose, onUnresolved }),
		});

		expect(onUnresolved).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ selector: "svg|a, [svg|href]" }));
	});

	it("should print the selector without JSON escaping in the warning", () => {
		runTransform(`.md\\:flex { @composes missing; }`, {
			visitor: globalComposes({ source: mocks.compose }),
		});

		expect(console.warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('(composed in ".md\\:flex" at'));
	});

	it.each([false, true])("should report the line of each @composes with customAtRules=%s", (configured) => {
		const onUnresolved = vi.fn();
		runTransform(`.foo {\n  color: red;\n  @composes missing;\n\n    @composes other;\n}`, {
			...(configured ? { customAtRules: globalComposesCustomAtRules } : {}),
			visitor: globalComposes({ source: mocks.compose, onUnresolved }),
		});

		expect(onUnresolved.mock.calls.map(([{ name, loc }]) => [name, loc])).toEqual([
			["missing", { source_index: 0, line: 2, column: 3 }],
			["other", { source_index: 0, line: 4, column: 5 }],
		]);
	});

	it("should pass each report its own copy of the location", () => {
		const lines: number[] = [];
		runTransform(`.foo { @composes missing other; }`, {
			visitor: globalComposes({
				source: mocks.compose,
				onUnresolved: ({ loc }) => {
					lines.push(loc.line);
					(loc as { line: number }).line += 100;
				},
			}),
		});

		expect(lines).toEqual([0, 0]);
	});

	it("should fail the transform when onUnresolved throws", () => {
		const visitor = globalComposes({
			source: mocks.compose,
			onUnresolved: ({ name }) => {
				throw new Error(`Unknown class ${name}`);
			},
		});

		expect(() => runTransform(`.foo { @composes missing; }`, { visitor })).toThrow("Unknown class missing");
	});

	it("should warn when composing from an empty source array", () => {
		const { code } = runTransform(`.foo { @composes missing; }`, {
			visitor: globalComposes({ source: [] }),
		});

		expect(code.toString()).toBe("");
		expect(console.warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('class "missing"'));
	});

	it("should report locations when called from a bundle visitor", async () => {
		const { code } = await bundleAsync({
			filename: "input.css",
			minify: true,
			resolver: { read: () => ".foo { color: red; }\n.bar { @composes missing; color: red; }" },
			customAtRules: globalComposesCustomAtRules,
			visitor: globalComposes({ source: mocks.compose }),
		});

		expect(code.toString()).toBe(".foo{color:red}.bar{color:red}");
		expect(console.warn).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining('(composed in ".bar" at line 2, column 8)'),
		);
	});

	it("should report the location of nested rules", () => {
		const { code } = runTransform(`.parent {\n  &:hover { @composes missing; color: red; }\n}`, {
			visitor: globalComposes({ source: mocks.compose }),
		});

		expect(code.toString()).toBe(".parent{&:hover{color:red}}");
		expect(console.warn).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining('(composed in "&:hover" at line 2, column 13)'),
		);
	});

	it("should report again when reusing the visitor for another transform", () => {
		const onUnresolved = vi.fn();
		const visitor = globalComposes({ source: mocks.compose, onUnresolved });
		for (const selector of [".first", ".second"]) {
			runTransform(`@media (min-width: 600px) { ${selector} { @composes missing; } }`, { visitor });
		}

		expect(onUnresolved.mock.calls.map(([{ selector }]) => selector)).toEqual([".first", ".second"]);
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
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const { code } = runTransform(`.foo { @composes nonexistent; color: blue; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe(".foo{color:#00f}");
		expect(warn).toHaveBeenCalledExactlyOnceWith(
			'[@sardine/lightningcss-plugin-global-composes]: class "nonexistent" not found in source (composed in ".foo" at line 1, column 8)',
		);
	});

	it("should throw a descriptive error when the source file does not exist", () => {
		expect(() => globalComposes({ source: "/nonexistent/path/missing.css" })).toThrow(
			"[@sardine/lightningcss-plugin-global-composes]",
		);
	});

	it("should compose declarations into rules with multiple selectors", () => {
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

	it("should not crash when processing rules with var() and no @composes (lightningcss >=1.28 regression)", () => {
		const { code } = runTransform(`.foo { color: var(--some-token); }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe(".foo{color:var(--some-token)}");
	});

	it("should not crash when a rule contains both @composes and var() (lightningcss >=1.28 regression)", () => {
		// Use a different property (font-size) to avoid lightningcss optimizing away
		// the composed "color: red" declaration when it would be shadowed by "color: var(...)".
		const { code } = runTransform(`.foo { font-size: var(--size); @composes bar; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe(".foo{color:red;font-size:var(--size)}");
	});

	it("should handle files with @import url() at the top level", () => {
		const source = `
			@import url("./base.css");
			.foo { @composes bar; }
		`;

		const { code } = runTransform(source, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toContain('@import "./base.css"');
		expect(code.toString()).toContain(".foo{color:red}");
	});

	it("should compose classes whose declarations contain var()", () => {
		const { code } = runTransform(`.foo { @composes bar-with-var; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.composeWithVar })]),
		});

		expect(code.toString()).toContain(".foo{color:var(--brand-color)}");
	});

	it("should preserve !important declarations from the composed class", () => {
		const { code } = runTransform(`.foo { @composes important-bar; }`, {
			visitor: composeVisitors([globalComposes({ source: mocks.compose })]),
		});

		expect(code.toString()).toBe(".foo{color:red!important}");
	});

	it("should compose declarations when @composes is inside @media", () => {
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
			".composed{cursor:pointer;visibility:visible;grid-row:20;gap:30px;height:10px;margin:1px}",
		);
	});

	it("should report unresolved names without running another Lightning CSS transform", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const visitor = globalComposes({ source: mocks.compose });
		const source = Array.from({ length: 100 }, (_, index) => `.component-${index} { @composes missing; }`).join("\n");
		vi.mocked(transform).mockClear();

		runTransform(source, { visitor });

		expect(console.warn).toHaveBeenCalledTimes(100);
		expect(transform).toHaveBeenCalledOnce();
	});

	it("should not print selectors when onUnresolved does not read them", () => {
		const visitor = globalComposes({ source: mocks.compose, onUnresolved: () => {} });
		vi.mocked(transform).mockClear();

		runTransform(`::-webkit-scrollbar { @composes missing other; }`, { visitor });

		expect(transform).toHaveBeenCalledOnce();
	});

	it("should print each unusual selector with one extra Lightning CSS transform", () => {
		const selectors: string[] = [];
		const visitor = globalComposes({
			source: mocks.compose,
			onUnresolved: ({ selector }) => {
				selectors.push(selector);
			},
		});
		vi.mocked(transform).mockClear();

		runTransform(`::-webkit-scrollbar { @composes missing other; } .plain { @composes missing; }`, { visitor });

		expect(selectors).toEqual(["::-webkit-scrollbar", "::-webkit-scrollbar", ".plain"]);
		expect(transform).toHaveBeenCalledTimes(2);
	});
});
