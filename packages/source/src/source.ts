import { stripNullValues } from "@sardine/lightningcss-plugin-utils";
import type {
	CustomProperty,
	Declaration,
	DeclarationBlock,
	MediaCondition,
	MediaQuery,
	StyleSheet,
	TokenOrValue,
} from "lightningcss";
import { bundle } from "lightningcss";

const ERROR_PREFIX = "[@sardine/lightningcss-plugin-source]:";

/** Parsed indexes shared by Lightning CSS plugins using the same source file. */
export interface CssSource {
	readonly filename: string;
	readonly classes: ReadonlyMap<string, DeclarationBlock<Declaration>>;
	readonly customMedia: ReadonlyMap<string, MediaCondition>;
	readonly customProperties: ReadonlyMap<string, TokenOrValue[]>;
}

/** A source filename or a source handle created with `createCssSource`. */
export type CssSourceInput = string | CssSource;

/**
 * Parse a CSS source file once and index the values used by Lightning CSS plugins.
 */
export function createCssSource(filename: string): CssSource {
	const customProperties = new Map<string, TokenOrValue[]>();
	let stylesheet!: StyleSheet<Declaration, MediaQuery>;

	try {
		bundle({
			filename,
			drafts: {
				customMedia: true,
			},
			visitor: {
				StyleSheet(value) {
					stylesheet = value;
				},
				Declaration: {
					custom(declaration: CustomProperty) {
						customProperties.set(declaration.name, stripNullValues(declaration.value));
					},
				},
			},
		});
	} catch (error) {
		throw new Error(`${ERROR_PREFIX} ${(error as Error).message}`, { cause: error });
	}

	const classes = new Map<string, DeclarationBlock<Declaration>>();
	const customMedia = new Map<string, MediaCondition>();
	for (const rule of stylesheet.rules) {
		if (rule.type === "custom-media") {
			const condition = rule.value.query.mediaQueries[0]?.condition;
			if (condition) {
				customMedia.set(rule.value.name, stripNullValues(condition));
			}
		} else if (rule.type === "style" && rule.value.declarations) {
			// Index every class in the selector. Sanitise lazily so rules without a class,
			// such as `:root`, are never deep-cloned.
			let declarations: DeclarationBlock<Declaration> | undefined;
			for (const selector of rule.value.selectors) {
				for (const token of selector) {
					if (token.type === "class") {
						declarations ??= stripNullValues(rule.value.declarations);
						classes.set(token.name, declarations);
					}
				}
			}
		}
	}

	return Object.freeze({
		filename,
		classes,
		customMedia,
		customProperties,
	});
}

/** Resolve a filename or reuse an existing parsed source handle. */
export function resolveCssSource(source: CssSourceInput): CssSource {
	return typeof source === "string" ? createCssSource(source) : source;
}
