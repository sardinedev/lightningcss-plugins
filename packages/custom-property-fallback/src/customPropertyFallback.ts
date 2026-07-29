import { stripNullValues } from "@sardine/lightningcss-plugin-utils";
import type { CustomProperty, TokenOrValue, Variable } from "lightningcss";
import { bundle } from "lightningcss";

export interface CustomPropertySource {
	readonly customProperties: ReadonlyMap<string, TokenOrValue[]>;
}

export type Options = {
	/** A CSS source path or a shared source handle containing custom property fallback values. */
	source: string | CustomPropertySource;
};

const ERROR_PREFIX = "[@sardine/lightningcss-plugin-custom-property-fallback]:";

function getCustomProperties(source: string | CustomPropertySource): ReadonlyMap<string, TokenOrValue[]> {
	if (typeof source !== "string") {
		return source.customProperties;
	}

	const customProperties = new Map<string, TokenOrValue[]>();
	try {
		bundle({
			filename: source,
			visitor: {
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

	return customProperties;
}

/**
 * Add source custom property values as fallbacks to matching `var()` references.
 */
export default ({ source }: Options) => {
	const customProperties = getCustomProperties(source);

	return {
		VariableExit(variable: Variable): TokenOrValue | undefined {
			if (variable.fallback != null) {
				return undefined;
			}

			const fallback = customProperties.get(variable.name.ident);
			if (!fallback) {
				return undefined;
			}

			return {
				type: "var",
				value: stripNullValues({
					...variable,
					fallback: [...fallback],
				}),
			};
		},
	};
};
