import console from "node:console";
import { type CssSource, type CssSourceInput, resolveCssSource } from "@sardine/lightningcss-plugin-source";
import { stripNullValues } from "@sardine/lightningcss-plugin-utils";
import type { CustomAtRules, Declaration, DeclarationBlock, Location2, Rule } from "lightningcss";
import { formatSelectors } from "./formatSelectors";

/** A composed class name that was not found in any source. */
export interface UnresolvedClass {
	/** The class name listed in `@composes`. */
	readonly name: string;
	/**
	 * Selectors of the rule containing the `@composes` at-rule, printed from the parsed
	 * selector with Lightning CSS's unminified formatting. Built when first read.
	 */
	readonly selector: string;
	/**
	 * Location of that rule as reported by Lightning CSS: `line` starts at 0 and `column` at 1.
	 * `source_index` is the file's position in the bundle's source map `sources` (0 is the entry file).
	 */
	readonly loc: Location2;
}

export type Options = {
	/**
	 * CSS source paths or shared source handles from `createCssSource` containing global classes.
	 * Later sources override duplicate classes.
	 */
	source: CssSourceInput | readonly CssSourceInput[];
	/**
	 * Called once per unresolved class name per consuming rule. Defaults to `console.warn`.
	 * Throw from the callback to fail the transform.
	 */
	onUnresolved?: (unresolved: UnresolvedClass) => void;
};

/**
 * Custom at-rules configuration for LightningCSS to avoid "Unknown at rule: @composes" warnings.
 *
 * Usage:
 * ```ts
 * import { globalComposesCustomAtRules } from "@sardine/lightningcss-plugin-global-composes";
 *
 * transform({
 *   customAtRules: {
 *     ...globalComposesCustomAtRules,
 *   },
 *   visitor: composeVisitors([globalComposes({ source: "./global.css" })]),
 * });
 * ```
 */
export const globalComposesCustomAtRules: CustomAtRules = {
	composes: {
		prelude: "<custom-ident>+",
		body: null,
	},
};

/**
 * Interface for custom at-rule value structure at runtime.
 * This represents the actual structure when customAtRules is configured,
 * even though the base type definition shows it as null.
 */
interface CustomAtRuleValue {
	name: string;
	prelude:
		| {
				type: "repeated";
				value: {
					components: Array<{ type: string; value: string }>;
				};
		  }
		| { type: "custom-ident"; value: string };
}

/**
 * Returns true if the given rule is an `@composes` at-rule, whether declared
 * as an unknown at-rule (back-compat) or as a configured custom at-rule.
 */
function isComposesAtRule(child: Rule<Declaration>): boolean {
	const isUnknownComposesRule = child.type === "unknown" && child.value.name === "composes";
	const customValue = child.type === "custom" ? (child.value as unknown as CustomAtRuleValue) : null;
	const isCustomComposesRule = customValue && customValue.name === "composes";
	return isUnknownComposesRule || !!isCustomComposesRule;
}

/**
 * Resolve a source path or handle, reporting failures under this plugin's name.
 * Path errors name the failing file; handles must carry a `classes` index.
 */
function resolveSource(entry: CssSourceInput): CssSource {
	let resolved: CssSource | undefined;
	try {
		resolved = resolveCssSource(entry);
	} catch (error) {
		// createCssSource keeps the Lightning CSS error as its cause; keep it here too so
		// callers can read its `fileName` and `loc`.
		const cause = ((error as Error).cause ?? error) as Error;
		throw Error(`[@sardine/lightningcss-plugin-global-composes]: Failed to load "${entry}": ${cause.message}`, {
			cause,
		});
	}
	if (!(resolved?.classes instanceof Map)) {
		throw Error(
			'[@sardine/lightningcss-plugin-global-composes]: Invalid source: expected a CSS file path or a handle from createCssSource() with a "classes" index. Handles from @sardine/lightningcss-plugin-source 1.x have no "classes"; upgrade it to ^2.0.0.',
		);
	}
	return resolved;
}

/**
 * Extract class names from @composes at-rule prelude.
 * Handles both unknown at-rules (TokenOrValue[]) and custom at-rules (ParsedComponent).
 */
function extractClassNames(child: Rule<Declaration>): string[] {
	const names: string[] = [];

	if (child.type === "unknown" && child.value.name === "composes") {
		// Unknown at-rule: prelude is TokenOrValue[]
		for (const token of child.value.prelude) {
			if (token.type === "token" && token.value.type === "ident") {
				names.push(token.value.value);
			}
		}
	} else if (child.type === "custom") {
		// Custom at-rule: prelude is ParsedComponent
		// Note: child.value is DefaultAtRule (null) in base types, but at runtime when
		// customAtRules is configured, it will have the actual custom at-rule structure
		const customValue = child.value as unknown as CustomAtRuleValue;
		if (customValue && customValue.name === "composes") {
			const prelude = customValue.prelude;
			if (prelude.type === "repeated") {
				// For "<custom-ident>+", prelude is { type: "repeated", value: { components: [...] } }
				for (const component of prelude.value.components) {
					if (component.type === "custom-ident") {
						names.push(component.value);
					}
				}
			} else if (prelude.type === "custom-ident") {
				// For a single custom-ident
				names.push(prelude.value);
			}
		}
	}

	return names;
}

/** Default `onUnresolved` handler: warn with the class name, consuming selector and its position. */
function warnUnresolved({ name, selector, loc }: UnresolvedClass): void {
	// Positions in files imported by `bundle()` need the file index to be found.
	const file = loc.source_index === 0 ? "" : ` of bundled file ${loc.source_index}`;
	console.warn(
		`[@sardine/lightningcss-plugin-global-composes]: class ${JSON.stringify(name)} not found in source (composed in "${selector}" at line ${loc.line + 1}, column ${loc.column}${file})`,
	);
}

function isSourceList(source: Options["source"]): source is readonly CssSourceInput[] {
	return Array.isArray(source);
}

/**
 * Compose global class declarations from one or more CSS sources.
 * Later sources replace earlier definitions of the same class, including `!important` declarations.
 * Within a rule, later composed names take precedence over earlier ones.
 * Unresolved names are passed to `onUnresolved`, which warns with the consuming selector and its location by default.
 *
 * @param options - CSS source paths or shared source handles to index once when creating the visitor.
 * @returns A Lightning CSS visitor that replaces `@composes` with the indexed declarations.
 * @example
 * globalComposes({ source: "./global.css" });
 * @example
 * transform({
 *   code: Buffer.from(".button { @composes typography; }"),
 *   visitor: composeVisitors([
 *     globalComposes({ source: ["./global.css", "./typography.css"] }),
 *   ]),
 * });
 */
export default ({ source, onUnresolved = warnUnresolved }: Options) => {
	// Build class index once at initialization to avoid repeated AST scans
	const classIndex = new Map<string, DeclarationBlock<Declaration>>();
	for (const entry of isSourceList(source) ? source : [source]) {
		for (const [name, declarations] of resolveSource(entry).classes) {
			classIndex.set(name, declarations);
		}
	}
	return {
		Rule: {
			style(rule: Rule<Declaration>): Rule<Declaration> | undefined {
				if (rule.type === "style" && rule.value.rules?.length) {
					// Fast path: if there is no @composes child at all, avoid allocating a new
					// array via filter. This is common in lightningcss >=1.28 where rules
					// often have rule.value.rules = [].
					const hasComposesChild = rule.value.rules.some((child) => isComposesAtRule(child));

					if (!hasComposesChild) {
						// No @composes children to process; keep the rule as-is and avoid
						// triggering the filter allocation below.
						return undefined;
					}

					let mutated = false;
					let unresolved: Set<string> | undefined;
					let selector: string | undefined;
					// Collect composed declarations in `@composes` order so later names win,
					// then place them all before the rule's own declarations below.
					// Both arrays are needed — omitting importantDeclarations would
					// silently drop any `!important` properties in the composed class.
					const composed: Declaration[] = [];
					const composedImportant: Declaration[] = [];
					rule.value.rules = rule.value.rules.filter((child) => {
						if (isComposesAtRule(child)) {
							mutated = true;
							const names = extractClassNames(child);
							for (const name of names) {
								// Use prebuilt index for O(1) lookup instead of O(R) scan
								const declarations = classIndex.get(name);
								if (!declarations) {
									unresolved ??= new Set();
									if (!unresolved.has(name)) {
										unresolved.add(name);
										const { selectors, loc } = rule.value;
										onUnresolved({
											name,
											loc,
											// Format lazily: callbacks that ignore the selector skip the cost.
											get selector() {
												selector ??= formatSelectors(selectors);
												return selector;
											},
										});
									}
									continue;
								}
								if (declarations.declarations?.length) {
									composed.push(...declarations.declarations);
								}
								if (declarations.importantDeclarations?.length) {
									composedImportant.push(...declarations.importantDeclarations);
								}
							}
							return false;
						}
						return true;
					});

					if (rule.value.declarations) {
						if (composed.length) {
							rule.value.declarations.declarations = composed.concat(rule.value.declarations.declarations ?? []);
						}
						if (composedImportant.length) {
							rule.value.declarations.importantDeclarations = composedImportant.concat(
								rule.value.declarations.importantDeclarations ?? [],
							);
						}
					}

					// Only return the rule when it was actually mutated (i.e. a @composes rule
					// was found and removed). Returning undefined tells lightningcss to keep the
					// rule as-is, avoiding the null-field deserialisation error introduced in
					// lightningcss >=1.28 where rule.value.rules is [] (truthy) even for rules
					// with no nested children, causing every rule to be returned and triggering:
					//   "failed to deserialize; expected an object-like struct named Specifier, found ()"
					if (mutated) {
						// Sanitize the mutated rule to strip null-valued keys so that
						// lightningcss can safely deserialize the structure (see
						// lightningcss >=1.28 null-field handling).
						const sanitizedRule = stripNullValues(rule) as Rule<Declaration>;
						return sanitizedRule;
					}
				}

				return undefined;
			},
		},
	};
};
