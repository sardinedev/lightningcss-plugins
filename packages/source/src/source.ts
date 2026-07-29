import { stripNullValues } from "@sardine/lightningcss-plugin-utils";
import type { CustomProperty, Declaration, MediaCondition, MediaQuery, StyleSheet, TokenOrValue } from "lightningcss";
import { bundle } from "lightningcss";

const ERROR_PREFIX = "[@sardine/lightningcss-plugin-source]:";

/** Parsed indexes shared by Lightning CSS plugins using the same source file. */
export interface CssSource {
	readonly filename: string;
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
		throw new Error(`${ERROR_PREFIX} ${(error as Error).message}`);
	}

	const customMedia = new Map<string, MediaCondition>();
	for (const rule of stylesheet.rules) {
		if (rule.type === "custom-media") {
			const condition = rule.value.query.mediaQueries[0]?.condition;
			if (condition) {
				customMedia.set(rule.value.name, stripNullValues(condition));
			}
		}
	}

	return Object.freeze({
		filename,
		customMedia,
		customProperties,
	});
}

/** Resolve a filename or reuse an existing parsed source handle. */
export function resolveCssSource(source: CssSourceInput): CssSource {
	return typeof source === "string" ? createCssSource(source) : source;
}
