import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import cssModulesTypes from "./cssModulesTypes";

const mocks = {
	basic: path.join(__dirname, "./mocks/basic.module.css"),
	withAssets: path.join(__dirname, "./mocks/with-assets.module.css"),
	noClasses: path.join(__dirname, "./mocks/no-classes.module.css"),
};

describe("cssModulesTypes", () => {
	describe("type content generation", () => {
		it("should generate typed declarations for all class names in a CSS Modules file", () => {
			const output = path.join(__dirname, "./mocks/basic.module.css.d.ts");
			const content = cssModulesTypes({ source: mocks.basic, output });

			expect(content).toContain(`readonly "icon": string;`);
			expect(content).toContain(`readonly "kebab-case": string;`);
			expect(content).toContain(`readonly "root": string;`);

			rmSync(output);
		});

		it("should sort class names alphabetically", () => {
			const output = path.join(__dirname, "./mocks/basic.module.css.d.ts");
			const content = cssModulesTypes({ source: mocks.basic, output });

			const lines = content.split("\n").filter((l) => l.trim().startsWith("readonly"));
			expect(lines[0]).toContain('"icon"');
			expect(lines[1]).toContain('"kebab-case"');
			expect(lines[2]).toContain('"root"');

			rmSync(output);
		});

		it("should wrap type declarations in a named const and export it as default", () => {
			const output = path.join(__dirname, "./mocks/basic.module.css.d.ts");
			const content = cssModulesTypes({ source: mocks.basic, output });

			expect(content).toMatch(/^declare const styles: \{/);
			expect(content).toContain("export default styles;");

			rmSync(output);
		});

		it("should generate Record<string, never> for a CSS file with no classes", () => {
			writeFileSync(mocks.noClasses, "body { color: red; }");
			const output = path.join(__dirname, "./mocks/no-classes.module.css.d.ts");
			const content = cssModulesTypes({ source: mocks.noClasses, output });

			expect(content).toBe("declare const styles: Record<string, never>;\nexport default styles;\n");

			rmSync(mocks.noClasses);
			rmSync(output);
		});

		it("should generate correct types for CSS with asset references and CSS variables", () => {
			const output = path.join(__dirname, "./mocks/with-assets.module.css.d.ts");
			const content = cssModulesTypes({ source: mocks.withAssets, output });

			expect(content).toContain(`readonly "footer": string;`);
			expect(content).toContain(`readonly "header": string;`);

			rmSync(output);
		});
	});

	describe("file output", () => {
		it("should write the .d.ts file to the specified output path", () => {
			const output = path.join(__dirname, "./mocks/basic.module.css.d.ts");
			cssModulesTypes({ source: mocks.basic, output });

			expect(existsSync(output)).toBe(true);
			const written = readFileSync(output, "utf-8");
			expect(written).toContain(`readonly "root": string;`);

			rmSync(output);
		});

		it("should default to writing to source.d.ts when no output is provided", () => {
			const defaultOutput = `${mocks.basic}.d.ts`;
			cssModulesTypes({ source: mocks.basic });

			expect(existsSync(defaultOutput)).toBe(true);

			rmSync(defaultOutput);
		});
	});

	describe("error handling", () => {
		it("should throw a descriptive error when the source file does not exist", () => {
			expect(() => cssModulesTypes({ source: "/nonexistent/path/missing.module.css" })).toThrow(
				"[@sardine/lightningcss-plugin-css-modules-types]",
			);
		});
	});
});
