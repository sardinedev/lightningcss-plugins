import { writeFileSync } from "node:fs";
import type { Selector, StyleSheet } from "lightningcss";

/**
 * Generates a TypeScript declaration block for the given class names.
 *
 * Class names are sorted alphabetically and quoted so that names
 * containing hyphens or other non-identifier characters remain valid
 * TypeScript property keys.
 */
function generateTypeContent(classNames: string[]): string {
	if (classNames.length === 0) {
		return "declare const styles: Record<never, never>;\nexport default styles;\n";
	}

	const sorted = [...classNames].sort();
	const properties = sorted.map((name) => `  readonly ${JSON.stringify(name)}: string;`).join("\n");
	return `declare const styles: {\n${properties}\n};\nexport default styles;\n`;
}

/**
 * A LightningCSS visitor plugin that generates TypeScript type declarations
 * for CSS Modules files.
 *
 * Collects local class names from selectors during AST traversal (before
 * hashing) and writes a `.d.ts` declaration file next to each `.module.css`
 * source file.
 *
 * Non-module CSS files are silently ignored.
 *
 * @example
 * ```ts
 * import { composeVisitors, transform } from "lightningcss";
 * import cssModulesTypes from "@sardine/lightningcss-plugin-css-modules-types";
 *
 * transform({
 *   filename: "button.module.css",
 *   code,
 *   cssModules: true,
 *   visitor: composeVisitors([cssModulesTypes()]),
 * });
 * // Writes button.module.css.d.ts
 * ```
 */
export default function cssModulesTypes() {
	const classNames = new Set<string>();

	return {
		Selector(selector: Selector) {
			for (const component of selector) {
				if (component.type === "class") {
					classNames.add(component.name);
				}
			}
		},
		StyleSheetExit(stylesheet: StyleSheet) {
			const source = stylesheet.sources[0];
			if (!source?.endsWith(".module.css")) {
				return;
			}

			const content = generateTypeContent([...classNames]);
			writeFileSync(`${source}.d.ts`, content);
		},
	};
}
