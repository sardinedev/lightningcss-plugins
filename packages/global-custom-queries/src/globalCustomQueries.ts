import { bundle } from "lightningcss";
import type { Declaration, MediaQuery, StyleSheet } from "lightningcss";

export type Options = {
	/* The path to the file you want to extract the custom queries from */
	source: string;
};

function returnAST(path: string): StyleSheet<Declaration, MediaQuery> {
	let ast: StyleSheet<Declaration, MediaQuery> | null = null;
	bundle({
		filename: path,
		drafts: {
			customMedia: true,
		},
		visitor: {
			StyleSheet(stylesheet) {
				ast = stylesheet;
			},
		},
	});
	if (!ast) {
		throw new Error(
			"[@sardine/lightningcss-plugin-global-custom-queries]: Could not find Media Queries in the file",
		);
	}
	return ast;
}

export default ({ source }: Options) => {
	const ast = returnAST(source);
	return {
		MediaQuery(query: MediaQuery): MediaQuery {
			if (
				query?.condition?.type === "feature" &&
				query.condition.value.name.startsWith("--")
			) {
				const matchedConditionValue = query.condition.value;
				let resolvedQuery = null;
				for (const rule of ast.rules) {
					if (
						rule.type === "custom-media" &&
						rule.value.name === matchedConditionValue.name
					) {
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
