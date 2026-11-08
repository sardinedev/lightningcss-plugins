import { composeVisitors, transform } from "lightningcss";
import { describe, test } from "vitest";
import urlComposer from "./urlComposer";

describe("urlComposer performance", () => {
	const mapping = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`KEY_${index}`, `value-${index}`]));
	const singleKeyVisitor = composeVisitors([urlComposer({ URL: "https://sardine.dev" })]);
	const manyKeysVisitor = composeVisitors([urlComposer({ ...mapping, URL: "https://sardine.dev" })]);

	const manyUrls = new TextEncoder().encode(
		Array.from(
			{ length: 1000 },
			(_, index) => `.icon-${index} { background: url(\${URL}/\${KEY_${index % 20}}/icon-${index}.svg); }`,
		).join("\n"),
	);

	test("single url replacement", async ({ bench }) => {
		await bench("single url replacement", () => {
			transform({
				filename: "test.css",
				minify: true,
				code: new TextEncoder().encode("body { background: url(${URL}/logo.svg); }"),
				visitor: singleKeyVisitor,
			});
		}).run();
	});

	test("1000 urls with a single key mapping", async ({ bench }) => {
		await bench("1000 urls with a single key mapping", () => {
			transform({
				filename: "test.css",
				minify: true,
				code: manyUrls,
				visitor: singleKeyVisitor,
			});
		}).run();
	});

	test("1000 urls with a 21 key mapping", async ({ bench }) => {
		await bench("1000 urls with a 21 key mapping", () => {
			transform({
				filename: "test.css",
				minify: true,
				code: manyUrls,
				visitor: manyKeysVisitor,
			});
		}).run();
	});
});
