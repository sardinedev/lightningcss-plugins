import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { composeVisitors, transform } from "lightningcss";
import { describe, test } from "vitest";
import customPropertyFallback from "./customPropertyFallback";

describe("customPropertyFallback performance", () => {
	const tokensPath = path.join(__dirname, "./mocks/tokens.css");

	// A large token file, similar to a design system's global variables.
	const largeTokensPath = path.join(
		mkdtempSync(path.join(tmpdir(), "lightningcss-custom-property-fallback-bench-")),
		"tokens.css",
	);
	writeFileSync(
		largeTokensPath,
		`:root {\n${Array.from({ length: 500 }, (_, index) => `\t--token-${index}: ${index}px solid rgb(0 0 0 / ${index % 100}%);`).join("\n")}\n}`,
	);

	const smallVisitor = composeVisitors([customPropertyFallback({ source: tokensPath })]);
	const largeVisitor = composeVisitors([customPropertyFallback({ source: largeTokensPath })]);

	const manyVarRules = new TextEncoder().encode(
		Array.from(
			{ length: 1000 },
			(_, index) => `.component-${index} { border: var(--token-${index % 500}); margin: var(--missing-${index}); }`,
		).join("\n"),
	);
	const withExistingFallbacks = new TextEncoder().encode(
		Array.from({ length: 1000 }, (_, index) => `.component-${index} { margin: var(--space-md, 4px); }`).join("\n"),
	);

	test("create plugin from small token file", async ({ bench }) => {
		await bench("create plugin from small token file", () => {
			customPropertyFallback({ source: tokensPath });
		}).run();
	});

	test("create plugin from large token file (500 properties)", async ({ bench }) => {
		await bench("create plugin from large token file (500 properties)", () => {
			customPropertyFallback({ source: largeTokensPath });
		}).run();
	});

	test("single var() with fallback added", async ({ bench }) => {
		await bench("single var() with fallback added", () => {
			transform({
				filename: "test.css",
				minify: true,
				code: new TextEncoder().encode(".card { padding: var(--content-spacing); }"),
				visitor: smallVisitor,
			});
		}).run();
	});

	test("1000 rules with resolved and unresolved var()", async ({ bench }) => {
		await bench("1000 rules with resolved and unresolved var()", () => {
			transform({
				filename: "test.css",
				minify: true,
				code: manyVarRules,
				visitor: largeVisitor,
			});
		}).run();
	});

	test("1000 rules with existing fallbacks", async ({ bench }) => {
		await bench("1000 rules with existing fallbacks", () => {
			transform({
				filename: "test.css",
				minify: true,
				code: withExistingFallbacks,
				visitor: smallVisitor,
			});
		}).run();
	});
});
