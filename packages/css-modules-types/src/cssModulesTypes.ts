import { readFileSync, writeFileSync } from "node:fs";
import { transform } from "lightningcss";

type Options = {
	/** Path to the CSS Modules file to generate types for. */
	source: string;
	/**
	 * Path to write the generated `.d.ts` file.
	 * Defaults to `${source}.d.ts`.
	 */
	output?: string;
};

/**
 * Generates a TypeScript declaration block for the given class names.
 *
 * Class names are sorted alphabetically and quoted so that names
 * containing hyphens or other non-identifier characters remain valid
 * TypeScript property keys.
 */
function generateTypeContent(classNames: string[]): string {
	if (classNames.length === 0) {
		return "declare const styles: Record<string, never>;\nexport default styles;\n";
	}

	const sorted = [...classNames].sort();
	const properties = sorted.map((name) => `  readonly ${JSON.stringify(name)}: string;`).join("\n");
	return `declare const styles: {\n${properties}\n};\nexport default styles;\n`;
}

/**
 * Generates TypeScript type declarations for a CSS Modules file.
 *
 * Parses the CSS file at `source` using LightningCSS with CSS Modules
 * enabled, extracts all exported class names, and writes a `.d.ts`
 * declaration file to `output` (defaults to `${source}.d.ts`).
 *
 * Returns the generated declaration content as a string.
 *
 * @example
 * ```ts
 * import cssModulesTypes from "@sardine/lightningcss-plugin-css-modules-types";
 *
 * cssModulesTypes({ source: "./src/button.module.css" });
 * // Writes ./src/button.module.css.d.ts
 * ```
 */
export default function cssModulesTypes({ source, output }: Options): string {
	const outputPath = output ?? `${source}.d.ts`;

	let code: Buffer;
	try {
		code = readFileSync(source);
	} catch (error) {
		throw new Error(`[@sardine/lightningcss-plugin-css-modules-types]: ${(error as Error).message}`);
	}

	let exports: Record<string, unknown>;
	try {
		const result = transform({
			filename: source,
			code,
			cssModules: true,
		});
		exports = (result.exports ?? {}) as Record<string, unknown>;
	} catch (error) {
		throw new Error(`[@sardine/lightningcss-plugin-css-modules-types]: ${(error as Error).message}`);
	}

	const classNames = Object.keys(exports);
	const content = generateTypeContent(classNames);

	writeFileSync(outputPath, content);

	return content;
}
