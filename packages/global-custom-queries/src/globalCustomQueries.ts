import { stripNullValues } from "@sardine/lightningcss-plugin-utils";
import type { Declaration, MediaCondition, MediaQuery, StyleSheet } from "lightningcss";
import { bundle } from "lightningcss";

export type Options = {
	/* The path to the file you want to extract the custom queries from */
	source: string;
};

function returnAST(source: string): StyleSheet<Declaration, MediaQuery> {
	// Definite assignment: bundle always invokes the StyleSheet visitor on success,
	// and throws (caught below) on failure — so ast is always set before `return`.
	let ast!: StyleSheet<Declaration, MediaQuery>;
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
		throw Error(`[@sardine/lightningcss-plugin-global-custom-queries]: ${(error as Error).message}`);
	}
}

/**
 * Recursively walks a `MediaCondition` and replaces any custom feature names
 * (those starting with `--`) with their resolved conditions from the lookup map.
 *
 * Handles all three condition shapes from the CSS Media Queries spec:
 * - `feature`   – a direct `(--name)` reference
 * - `not`       – negation wrapping an inner condition, e.g. `not (--name)`
 * - `operation` – AND / OR compound conditions, e.g. `(--name) and (color)`
 */
function resolveCondition(condition: MediaCondition, lookup: (name: string) => MediaCondition | null): MediaCondition {
	if (condition.type === "feature") {
		const name = condition.value.name;
		if (typeof name === "string" && name.startsWith("--")) {
			return lookup(name) ?? condition;
		}
		return condition;
	}
	if (condition.type === "not") {
		return { ...condition, value: resolveCondition(condition.value, lookup) };
	}
	if (condition.type === "operation") {
		return { ...condition, conditions: condition.conditions.map((c) => resolveCondition(c, lookup)) };
	}
	return condition;
}

/**
 * @param source The path to the file you want to extract the custom queries from
 * @returns A visitor that resolves the custom queries
 * @example
 * const res = transform({
 * minify: true,
 * code: Buffer.from("@media (--small-breakpoint){.foo{color:red}}"),
 * visitor: composeVisitors([globalCustomQueries({ source: "./custom-media.css" })]),
 * });
 *
 * assert.strictEqual(
 * res.code.toString(),
 * "@media (width<=100em){.foo{color:red}}",
 * new TypeError("Replaced URL is not the same")
 * );
 */
export default ({ source }: Options) => {
	const ast = returnAST(source);

	/** Index of `@custom-media` rule name → resolved condition, built once at setup. */
	const customMediaMap = new Map<string, MediaCondition>();
	for (const rule of ast.rules) {
		if (rule.type === "custom-media") {
			const condition = rule.value.query.mediaQueries[0]?.condition;
			if (condition) {
				customMediaMap.set(rule.value.name, stripNullValues(condition));
			}
		}
	}

	const lookup = (name: string): MediaCondition | null => customMediaMap.get(name) ?? null;

	return {
		MediaQuery(query: MediaQuery): MediaQuery {
			if (query?.condition) {
				query.condition = resolveCondition(query.condition, lookup);
			}
			return query;
		},
	};
};
