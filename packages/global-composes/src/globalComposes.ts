import type { CustomAtRules, Declaration, DeclarationBlock, MediaQuery, Rule, StyleSheet } from "lightningcss";
import { bundle } from "lightningcss";

type Options = {
	/* The path to the file you want to extract the global classes from */
	source: string;
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
 * @param source The path to the file you want to extract the custom queries from
 * @returns A visitor that composes the global classes
 * @example
 * const res = transform({
 * minify: true,
 * code: Buffer.from(".foo{@composes bar}"),
 * visitor: composeVisitors([globalComposes({ source: "./global.css" })]),
 * });
 *
 * assert.strictEqual(
 * res.code.toString(),
 * ".foo{color:red}",
 * new TypeError("Replaced URL is not the same")
 * );
 */
function returnAST(source: string): StyleSheet<Declaration, MediaQuery> | null {
	let ast: StyleSheet<Declaration, MediaQuery> | null = null;
	try {
		bundle({
			filename: source,
			drafts: {
				customMedia: true,
			},
			visitor: {
				StyleSheet(stylesheet) {
					ast = stylesheet;
				},
			},
		});
		return ast;
	} catch (error) {
		throw Error(`[@sardine/lightningcss-plugin-global-composes]: ${(error as Error).message}`);
	}
}

/**
 * Recursively remove `null`-valued keys from an object tree.
 *
 * lightningcss ≥1.30.2 changed how it deserialises Rust `Option<T>` fields that
 * arrive back from JavaScript: a `None` value **must** now be represented as a
 * missing key, not as `null`.  However, lightningcss's own serialiser (Rust→JS)
 * still emits `null` for those absent optional fields (e.g.
 * `DashedIdentReference.from` and `Variable.fallback`).
 *
 * When we capture declarations from `bundle()` and then return them from a
 * *different* `transform()` visitor call, those stale `null` fields trip the
 * deserialiser with:
 *   "failed to deserialize; expected an object-like struct named Specifier, found ()"
 *
 * Stripping every `null`-valued key before storing them in the class index
 * makes the objects safe to re-inject.
 *
 * @see https://github.com/parcel-bundler/lightningcss/issues/1081
 */
function stripNullValues<T>(value: T): T {
	if (value === null || value === undefined) return value;
	if (Array.isArray(value)) {
		return value.map(stripNullValues) as unknown as T;
	}
	if (typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			if (v !== null) {
				out[k] = stripNullValues(v);
			}
		}
		return out as T;
	}
	return value;
}

/**
 * Build an index mapping class names to their declaration blocks.
 * This performs a single AST walk to enable O(1) lookups instead of O(R) scans.
 */
function buildClassIndex(ast: StyleSheet<Declaration, MediaQuery>): Map<string, DeclarationBlock<Declaration>> {
	const classMap = new Map<string, DeclarationBlock<Declaration>>();
	for (const rule of ast.rules) {
		if (rule.type === "style" && rule.value.selectors && rule.value.declarations) {
			// Sanitise once per rule, not once per class token — a compound selector like
			// `.foo.bar` would otherwise deep-clone and strip the same declarations block
			// multiple times, wasting work on large stylesheets.
			const sanitized = stripNullValues(rule.value.declarations);
			for (const selector of rule.value.selectors) {
				for (const token of selector) {
					if (token.type === "class") {
						classMap.set(token.name, sanitized);
					}
				}
			}
		}
	}
	return classMap;
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

export default ({ source }: Options) => {
	const ast = returnAST(source);
	if (!ast) {
		throw Error(`[@sardine/lightningcss-plugin-global-composes]: The file "${source}" does not contain valid CSS.`);
	}
	// Build class index once at initialization to avoid repeated AST scans
	const classIndex = buildClassIndex(ast);
	return {
		Rule: {
			style(rule: Rule<Declaration>): Rule<Declaration> {
				if (rule.type === "style" && rule.value.rules) {
					rule.value.rules = rule.value.rules.filter((child) => {
						// Support both custom (when customAtRules is configured) and unknown (fallback for back-compat)
						const isComposesRule = child.type === "unknown" && child.value.name === "composes";

						// For custom at-rules, we need to check the runtime value
						const customValue = child.type === "custom" ? (child.value as unknown as CustomAtRuleValue) : null;
						const isCustomComposesRule = customValue && customValue.name === "composes";

						if (isComposesRule || isCustomComposesRule) {
							const names = extractClassNames(child);
							for (const name of names) {
								// Use prebuilt index for O(1) lookup instead of O(R) scan
								const declarations = classIndex.get(name);
								if (declarations?.declarations && rule.value.declarations?.declarations) {
									rule.value.declarations.declarations = declarations.declarations.concat(
										rule.value.declarations?.declarations,
									);
								}
							}
							return false;
						}
						return true;
					});
				}

				return rule;
			},
		},
	};
};
