import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { composeVisitors, transform } from "lightningcss";
import { describe, test } from "vitest";
import globalCustomQueries from "./globalCustomQueries";

describe("globalCustomQueries performance", () => {
	const customMediaPath = path.join(__dirname, "./mocks/custom-media.css");

	// A source with many custom media definitions, like a shared breakpoints file.
	const largeCustomMediaPath = path.join(
		mkdtempSync(path.join(tmpdir(), "lightningcss-global-custom-queries-bench-")),
		"custom-media.css",
	);
	writeFileSync(
		largeCustomMediaPath,
		Array.from({ length: 200 }, (_, index) => `@custom-media --bp-${index} (width >= ${index + 1}0px);`).join("\n"),
	);

	const smallVisitor = composeVisitors([globalCustomQueries({ source: customMediaPath })]);
	const largeVisitor = composeVisitors([globalCustomQueries({ source: largeCustomMediaPath })]);

	const manyMediaQueries = new TextEncoder().encode(
		Array.from({ length: 500 }, (_, index) => `@media (--bp-${index % 200}) { .c-${index} { color: red; } }`).join(
			"\n",
		),
	);
	const compoundMediaQueries = new TextEncoder().encode(
		Array.from(
			{ length: 500 },
			(_, index) =>
				`@media ((--bp-${index % 200}) and (color)) or (not (--bp-${(index + 1) % 200})) { .c-${index} { color: red; } }`,
		).join("\n"),
	);

	test("create plugin from small file", async ({ bench }) => {
		await bench("create plugin from small file", () => {
			globalCustomQueries({ source: customMediaPath });
		}).run();
	});

	test("create plugin from large file (200 custom media)", async ({ bench }) => {
		await bench("create plugin from large file (200 custom media)", () => {
			globalCustomQueries({ source: largeCustomMediaPath });
		}).run();
	});

	test("single custom media query", async ({ bench }) => {
		await bench("single custom media query", () => {
			transform({
				filename: "test.css",
				minify: true,
				code: new TextEncoder().encode("@media (--breakpoint) { .foo { color: red; } }"),
				visitor: smallVisitor,
			});
		}).run();
	});

	test("500 custom media queries", async ({ bench }) => {
		await bench("500 custom media queries", () => {
			transform({
				filename: "test.css",
				minify: true,
				code: manyMediaQueries,
				visitor: largeVisitor,
			});
		}).run();
	});

	test("500 compound custom media queries", async ({ bench }) => {
		await bench("500 compound custom media queries", () => {
			transform({
				filename: "test.css",
				minify: true,
				code: compoundMediaQueries,
				visitor: largeVisitor,
			});
		}).run();
	});
});
