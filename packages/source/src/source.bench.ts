import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "vitest";
import { createCssSource } from "./source";

describe("source performance", () => {
	const tokensPath = path.join(__dirname, "./mocks/tokens.css");

	// A larger source mixing custom media, custom properties and classes so every
	// index built by `createCssSource` is exercised.
	const largePath = path.join(mkdtempSync(path.join(tmpdir(), "lightningcss-source-bench-")), "large.css");
	writeFileSync(
		largePath,
		[
			...Array.from({ length: 100 }, (_, index) => `@custom-media --bp-${index} (width <= ${index + 1}0rem);`),
			`:root {\n${Array.from({ length: 500 }, (_, index) => `\t--token-${index}: ${index}px;`).join("\n")}\n}`,
			...Array.from(
				{ length: 500 },
				(_, index) => `.class-${index}, .alias-${index} { margin: ${index}px; color: var(--token-${index}); }`,
			),
		].join("\n"),
	);

	test("createCssSource from small file", async ({ bench }) => {
		await bench("createCssSource from small file", () => {
			createCssSource(tokensPath);
		}).run();
	});

	test("createCssSource from large file", async ({ bench }) => {
		await bench("createCssSource from large file", () => {
			createCssSource(largePath);
		}).run();
	});
});
