import { bundle } from "lightningcss";
import type {
	Declaration,
	DeclarationBlock,
	MediaQuery,
	Rule,
	StyleSheet,
} from "lightningcss";

type Options = {
	/* The path to the file you want to extract the global classes from */
	source: string;
};

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
		throw Error(
			`[@sardine/lightningcss-plugin-global-composes]: ${(error as Error).message}`,
		);
	}
}

function findClass(name: string, ast: StyleSheet<Declaration, MediaQuery>) {
	for (const rule of ast.rules) {
		if (rule.type === "style" && rule.value.selectors) {
			for (const selector of rule.value.selectors) {
				for (const token of selector) {
					if (token.type === "class" && token.name === name) {
						return rule.value.declarations;
					}
				}
			}
		}
	}
	return null;
}

export default ({ source }: Options) => {
	const ast = returnAST(source);
	if (!ast) {
		throw Error(
			`[@sardine/lightningcss-plugin-global-composes]: The file "${source}" does not contain valid CSS.`,
		);
	}
	const classes = new Map<string, DeclarationBlock<Declaration>>();
	return {
		Rule: {
			style(rule: Rule<Declaration>): Rule<Declaration> {
				if (rule.type === "style" && rule.value.rules) {
					rule.value.rules = rule.value.rules.filter((child) => {
						if (child.type === "unknown" && child.value.name === "composes") {
							for (const token of child.value.prelude) {
								if (token.type === "token" && token.value.type === "ident") {
									const name = token.value.value;
									if (!classes.has(name)) {
										const declararations = findClass(name, ast);
										if (declararations) {
											classes.set(name, declararations);
										}
									}
									const declararations = classes.get(name);
									if (
										declararations?.declarations &&
										rule.value.declarations?.declarations
									) {
										rule.value.declarations.declarations =
											declararations.declarations.concat(
												rule.value.declarations?.declarations,
											);
									}
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
