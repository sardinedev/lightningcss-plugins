import type { Declaration, MediaQuery, StyleSheet } from "lightningcss";
import { bundle } from "lightningcss";

export type Options = {
	/* The path to the file you want to extract the custom queries from */
	source: string;
};

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
		throw Error(`[@sardine/lightningcss-plugin-global-custom-queries]: ${(error as Error).message}`);
	}
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
	if (!ast) {
		throw Error(
			`[@sardine/lightningcss-plugin-global-custom-queries]: The file "${source}" does not contain valid CSS.`,
		);
	}
	return {
		MediaQuery(query: MediaQuery): MediaQuery {
			if (query?.condition?.type === "feature" && query.condition.value.name.startsWith("--")) {
				const matchedConditionValue = query.condition.value;
				let resolvedQuery = null;
				for (const rule of ast.rules) {
					if (rule.type === "custom-media" && rule.value.name === matchedConditionValue.name) {
						resolvedQuery = rule.value.query.mediaQueries[0];
						break;
					}
				}
				if (resolvedQuery?.condition) {
					query.condition = resolvedQuery.condition;
				}
			}
			return query;
		},
	};
};
