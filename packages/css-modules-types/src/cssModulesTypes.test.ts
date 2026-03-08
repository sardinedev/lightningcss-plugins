import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { composeVisitors, transform } from "lightningcss";
import { afterEach, describe, expect, it } from "vitest";
import cssModulesTypes from "./cssModulesTypes";

const mocks = {
	basic: path.join(__dirname, "./mocks/basic.module.css"),
	withAssets: path.join(__dirname, "./mocks/with-assets.module.css"),
};

const generatedPaths = new Set<string>();

function markForCleanup(filePath: string): string {
	generatedPaths.add(filePath);
	return filePath;
}

function runTransform(filename: string) {
	transform({
		filename,
		code: readFileSync(filename),
		cssModules: true,
		visitor: composeVisitors([cssModulesTypes()]),
	});
}

function transformInlineCSS(css: string): string {
	const filename = path.join(__dirname, "./mocks/_inline.module.css");
	markForCleanup(`${filename}.d.ts`);
	transform({
		filename,
		code: Buffer.from(css),
		cssModules: true,
		visitor: composeVisitors([cssModulesTypes()]),
	});
	return readFileSync(`${filename}.d.ts`, "utf-8");
}

describe("cssModulesTypes", () => {
	afterEach(() => {
		for (const filePath of generatedPaths) {
			rmSync(filePath, { force: true });
		}
		generatedPaths.clear();
	});

	describe("type content generation", () => {
		it("should generate typed declarations for all class names in a CSS Modules file", () => {
			const output = markForCleanup(`${mocks.basic}.d.ts`);
			runTransform(mocks.basic);
			const content = readFileSync(output, "utf-8");

			expect(content).toContain(`readonly "icon": string;`);
			expect(content).toContain(`readonly "kebab-case": string;`);
			expect(content).toContain(`readonly "root": string;`);
		});

		it("should sort class names alphabetically", () => {
			const output = markForCleanup(`${mocks.basic}.d.ts`);
			runTransform(mocks.basic);
			const content = readFileSync(output, "utf-8");

			const lines = content.split("\n").filter((l) => l.trim().startsWith("readonly"));
			expect(lines[0]).toContain('"icon"');
			expect(lines[1]).toContain('"kebab-case"');
			expect(lines[2]).toContain('"root"');
		});

		it("should wrap type declarations in a named const and export it as default", () => {
			const output = markForCleanup(`${mocks.basic}.d.ts`);
			runTransform(mocks.basic);
			const content = readFileSync(output, "utf-8");

			expect(content).toMatch(/^declare const styles: \{/);
			expect(content).toContain("export default styles;");
		});

		it("should generate Record<never, never> for a CSS file with no classes", () => {
			const content = transformInlineCSS("body { color: red; }");

			expect(content).toBe("declare const styles: Record<never, never>;\nexport default styles;\n");
		});

		it("should generate correct types for CSS with asset references and CSS variables", () => {
			const output = markForCleanup(`${mocks.withAssets}.d.ts`);
			runTransform(mocks.withAssets);
			const content = readFileSync(output, "utf-8");

			expect(content).toContain(`readonly "footer": string;`);
			expect(content).toContain(`readonly "header": string;`);
		});

		it("should deduplicate class names used in multiple rules", () => {
			const content = transformInlineCSS(".root { color: red; } .root { font-size: 12px; } .icon { display: flex; }");

			const lines = content.split("\n").filter((l) => l.trim().startsWith("readonly"));
			expect(lines).toHaveLength(2);
			expect(content).toContain(`readonly "icon": string;`);
			expect(content).toContain(`readonly "root": string;`);
		});

		it("should collect class names inside nested at-rules", () => {
			const content = transformInlineCSS(
				".outer { color: red; } @media (min-width: 768px) { .inner { display: flex; } }",
			);

			expect(content).toContain(`readonly "inner": string;`);
			expect(content).toContain(`readonly "outer": string;`);
		});

		it("should not include global class names in generated types", () => {
			const content = transformInlineCSS(".local { color: red; } :global(.global-class) { color: blue; }");

			expect(content).toContain(`readonly "local": string;`);
			expect(content).not.toContain("global-class");
		});

		it("should use original class names even when hashing is enabled", () => {
			const output = markForCleanup(`${mocks.basic}.d.ts`);
			const result = transform({
				filename: mocks.basic,
				code: readFileSync(mocks.basic),
				cssModules: true,
				visitor: composeVisitors([cssModulesTypes()]),
			});
			const content = readFileSync(output, "utf-8");

			// The transform output has hashed class names
			const hashedNames = Object.values(result.exports ?? {}).map((e) => (e as { name: string }).name);
			expect(hashedNames.some((n) => n !== "root" && n !== "icon" && n !== "kebab-case")).toBe(true);

			// But the .d.ts has the original source names
			expect(content).toContain(`readonly "icon": string;`);
			expect(content).toContain(`readonly "kebab-case": string;`);
			expect(content).toContain(`readonly "root": string;`);
		});
	});

	describe("file output", () => {
		it("should write the .d.ts file next to the source CSS module", () => {
			const output = markForCleanup(`${mocks.basic}.d.ts`);
			runTransform(mocks.basic);

			expect(existsSync(output)).toBe(true);
			const written = readFileSync(output, "utf-8");
			expect(written).toContain(`readonly "root": string;`);
		});
	});

	describe("non-module files", () => {
		it("should not write a .d.ts file for non-module CSS files", () => {
			const filename = path.join(__dirname, "./mocks/regular.css");
			const possibleOutput = `${filename}.d.ts`;
			markForCleanup(possibleOutput);

			transform({
				filename,
				code: Buffer.from(".foo { color: red; }"),
				visitor: composeVisitors([cssModulesTypes()]),
			});

			expect(existsSync(possibleOutput)).toBe(false);
		});
	});
});
