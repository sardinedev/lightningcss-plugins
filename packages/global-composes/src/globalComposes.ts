import console from "node:console";
import { type CssSource, type CssSourceInput, resolveCssSource } from "@sardine/lightningcss-plugin-source";
import { stripNullValues } from "@sardine/lightningcss-plugin-utils";
import type { CustomAtRules, Declaration, DeclarationBlock, Location2, Rule, TokenOrValue } from "lightningcss";
import { formatSelectors } from "./formatSelectors";

const PLUGIN_PREFIX = "[@sardine/lightningcss-plugin-global-composes]:";

type ClassIndex = ReadonlyMap<string, DeclarationBlock<Declaration>>;

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
	 * Location of the `@composes` at-rule as reported by Lightning CSS: `line` starts at 0 and
	 * `column` at 1. `source_index` is the file's position in the bundle's source map `sources`
	 * (0 is the entry file). This is a copy, so changing it does not affect the output.
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
	loc?: Location2;
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
 * The parts of an `@composes` at-rule the plugin reads. Unknown at-rules have a
 * `TokenOrValue[]` prelude; configured custom at-rules have a parsed component.
 */
interface ComposesAtRule {
	loc?: Location2;
	prelude: TokenOrValue[] | CustomAtRuleValue["prelude"];
}

/**
 * Returns the `@composes` at-rule in `child`, whether declared as an unknown
 * at-rule (back-compat) or as a configured custom at-rule, or null for any other rule.
 * Allocation-free, so it is cheap to call on every nested rule.
 */
function asComposesAtRule(child: Rule<Declaration>): ComposesAtRule | null {
	// child.value is DefaultAtRule (null) in base types for custom at-rules, but at runtime
	// when customAtRules is configured it has the custom at-rule structure.
	const value =
		child.type === "unknown"
			? child.value
			: child.type === "custom"
				? (child.value as unknown as CustomAtRuleValue | null)
				: null;
	return value?.name === "composes" ? value : null;
}

/** True for `ReadonlyMap`-like class indexes, including maps from another realm. */
function isClassIndex(value: unknown): value is ClassIndex {
	const map = value as ClassIndex | undefined;
	return typeof map?.get === "function" && typeof map[Symbol.iterator] === "function";
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
		throw Error(`${PLUGIN_PREFIX} Failed to load "${entry}": ${cause.message}`, { cause });
	}
	if (!isClassIndex(resolved?.classes)) {
		throw Error(
			`${PLUGIN_PREFIX} Invalid source: expected a CSS file path or a handle from createCssSource() with a "classes" index. Handles from @sardine/lightningcss-plugin-source 1.x have no "classes"; upgrade it to ^2.0.0.`,
		);
	}
	return resolved;
}

/** Merge source indexes in order so later sources win. A single source is used as is. */
function buildClassIndex(sources: readonly CssSource[]): ClassIndex {
	const [first, ...rest] = sources;
	if (first && rest.length === 0) {
		return first.classes;
	}
	const classIndex = new Map<string, DeclarationBlock<Declaration>>();
	for (const { classes } of sources) {
		for (const [name, declarations] of classes) {
			classIndex.set(name, declarations);
		}
	}
	return classIndex;
}

/** Extract class names from an `@composes` prelude. */
function extractClassNames({ prelude }: ComposesAtRule): string[] {
	const names: string[] = [];

	if (Array.isArray(prelude)) {
		// Unknown at-rule: prelude is TokenOrValue[]
		for (const token of prelude) {
			if (token.type === "token" && token.value.type === "ident") {
				names.push(token.value.value);
			}
		}
	} else if (prelude.type === "repeated") {
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

	return names;
}

/** Default `onUnresolved` handler: warn with the class name, consuming selector and its position. */
function warnUnresolved({ name, selector, loc }: UnresolvedClass): void {
	// Positions in files imported by `bundle()` need the file index to be found.
	const file = loc.source_index === 0 ? "" : ` of bundled file ${loc.source_index}`;
	console.warn(
		`${PLUGIN_PREFIX} class ${JSON.stringify(name)} not found in source (composed in "${selector}" at line ${loc.line + 1}, column ${loc.column}${file})`,
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
	const classIndex = buildClassIndex((isSourceList(source) ? source : [source]).map(resolveSource));
	return {
		Rule: {
			style(rule: Rule<Declaration>): Rule<Declaration> | undefined {
				if (rule.type === "style" && rule.value.rules?.length) {
					// Fast path: if there is no @composes child at all, avoid allocating a new
					// array via filter. This is common in lightningcss >=1.28 where rules
					// often have rule.value.rules = [].
					const hasComposesChild = rule.value.rules.some((child) => asComposesAtRule(child) !== null);

					if (!hasComposesChild) {
						// No @composes children to process; keep the rule as-is and avoid
						// triggering the filter allocation below.
						return undefined;
					}

					let unresolved: Set<string> | undefined;
					let selector: string | undefined;
					// Collect composed declarations in `@composes` order so later names win,
					// then place them all before the rule's own declarations below.
					// Both arrays are needed — omitting importantDeclarations would
					// silently drop any `!important` properties in the composed class.
					const composed: Declaration[] = [];
					const composedImportant: Declaration[] = [];
					rule.value.rules = rule.value.rules.filter((child) => {
						const composes = asComposesAtRule(child);
						if (composes) {
							for (const name of extractClassNames(composes)) {
								// Use prebuilt index for O(1) lookup instead of O(R) scan
								const declarations = classIndex.get(name);
								if (!declarations) {
									unresolved ??= new Set();
									if (!unresolved.has(name)) {
										unresolved.add(name);
										const { selectors } = rule.value;
										onUnresolved({
											name,
											// Copy so a callback that edits it cannot change the output's source map.
											loc: { ...(composes.loc ?? rule.value.loc) },
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

					// Reaching this point means at least one @composes rule was removed, so the
					// rule always changed. Untouched rules return undefined above, which tells
					// lightningcss to keep them as-is, avoiding the null-field deserialisation
					// error introduced in lightningcss >=1.28 where rule.value.rules is [] (truthy)
					// even for rules with no nested children, causing every rule to be returned and triggering:
					//   "failed to deserialize; expected an object-like struct named Specifier, found ()"
					// Sanitize the mutated rule to strip null-valued keys so that lightningcss can
					// safely deserialize the structure (see lightningcss >=1.28 null-field handling).
					return stripNullValues(rule) as Rule<Declaration>;
				}

				return undefined;
			},
		},
	};
};
