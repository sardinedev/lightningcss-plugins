import { stripNullValues } from "@sardine/lightningcss-plugin-utils";
import type { AttrSelectorOperator, Combinator, ParsedCaseSensitivity, Selector, SelectorList } from "lightningcss";
import { transform } from "lightningcss";

type Component = Selector[number];
type PseudoClassComponent = Extract<Component, { type: "pseudo-class" }>;
type PseudoElementComponent = Extract<Component, { type: "pseudo-element" }>;

/** Thrown by the JS printer for selector components it leaves to Lightning CSS. */
const UNSUPPORTED = Symbol("unsupported selector component");

function unsupported(): never {
	throw UNSUPPORTED;
}

const COMBINATORS: Partial<Record<Combinator, string>> = {
	child: " > ",
	descendant: " ",
	"next-sibling": " + ",
	"later-sibling": " ~ ",
};

const ATTRIBUTE_OPERATORS: Record<AttrSelectorOperator, string> = {
	equal: "=",
	includes: "~=",
	"dash-match": "|=",
	prefix: "^=",
	substring: "*=",
	suffix: "$=",
};

const CASE_SENSITIVITY: Partial<Record<ParsedCaseSensitivity, string>> = {
	"ascii-case-insensitive": " i",
	"explicit-case-sensitive": " s",
};

/** Pseudo-elements Lightning CSS prints with a single colon. */
const LEGACY_PSEUDO_ELEMENTS = new Set(["before", "after", "first-line", "first-letter"]);

function hexEscape(code: number): string {
	return `\\${code.toString(16)} `;
}

/** Escape the characters of a CSS name, matching cssparser's `serialize_name`. */
function printName(value: string): string {
	let result = "";
	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;
		if (/[\w-]/.test(char) || code >= 0x80) {
			result += char;
		} else if (code === 0) {
			result += "�";
		} else if (code < 0x20 || code === 0x7f) {
			result += hexEscape(code);
		} else {
			result += `\\${char}`;
		}
	}
	return result;
}

/** Escape a CSS identifier, matching cssparser's `serialize_identifier`. */
function printIdentifier(value: string): string {
	if (value.startsWith("--")) {
		return `--${printName(value.slice(2))}`;
	}
	if (value === "-") {
		return "\\-";
	}
	let prefix = "";
	let rest = value;
	if (rest.startsWith("-")) {
		prefix = "-";
		rest = rest.slice(1);
	}
	const first = rest.charCodeAt(0);
	if (first >= 0x30 && first <= 0x39) {
		prefix += hexEscape(first);
		rest = rest.slice(1);
	}
	return prefix + printName(rest);
}

/** Quote a CSS string, matching cssparser's `serialize_string`. */
function printString(value: string): string {
	let result = "";
	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;
		if (char === '"' || char === "\\") {
			result += `\\${char}`;
		} else if (code === 0) {
			result += "�";
		} else if (code < 0x20 || code === 0x7f) {
			result += hexEscape(code);
		} else {
			result += char;
		}
	}
	return `"${result}"`;
}

/** Print an `An+B` value the way Lightning CSS does. */
function printNth(a: number, b: number): string {
	if (a === 2 && b === 1) return "odd";
	if (a === 0) return String(b);
	const step = a === 1 ? "n" : a === -1 ? "-n" : `${a}n`;
	if (b === 0) return step;
	return `${step}${b > 0 ? "+" : ""}${b}`;
}

/** Print a pseudo-class or pseudo-element that carries no data besides an empty vendor prefix. */
function printKeyword(colons: string, component: PseudoClassComponent | PseudoElementComponent): string {
	for (const [key, value] of Object.entries(component)) {
		const isEmptyVendorPrefix = key === "vendorPrefix" && Array.isArray(value) && value.length === 0;
		if (key !== "type" && key !== "kind" && !isEmptyVendorPrefix) {
			unsupported();
		}
	}
	return `${colons}${component.kind}`;
}

function printPseudoClass(component: PseudoClassComponent): string {
	switch (component.kind) {
		case "not":
		case "is":
		case "where":
			return `:${component.kind}(${printSelectorList(component.selectors)})`;
		case "has":
			// Relative selectors such as `> img` start with an implicit `:scope`, which
			// Lightning CSS leaves out, printing `:has( > img)`.
			return `:has(${component.selectors
				.map((selector) =>
					selector[0]?.type === "pseudo-class" && selector[0].kind === "scope" && selector[1]?.type === "combinator"
						? printSelector(selector.slice(1))
						: printSelector(selector),
				)
				.join(", ")})`;
		case "nth-child":
		case "nth-last-child": {
			const of = component.of?.length ? ` of ${printSelectorList(component.of)}` : "";
			return `:${component.kind}(${printNth(component.a, component.b)}${of})`;
		}
		case "nth-col":
		case "nth-last-col":
		case "nth-of-type":
		case "nth-last-of-type":
			return `:${component.kind}(${printNth(component.a, component.b)})`;
		case "host":
			return component.selectors ? `:host(${printSelector(component.selectors)})` : ":host";
		case "lang":
			return `:lang(${component.languages.map(printIdentifier).join(", ")})`;
		case "dir":
			return `:dir(${component.direction})`;
		case "state":
			return `:state(${printIdentifier(component.state)})`;
		case "active-view-transition-type":
			// Its argument list is stored in a `type` field, which printKeyword would skip.
			return unsupported();
		default:
			return printKeyword(":", component);
	}
}

function printPseudoElement(component: PseudoElementComponent): string {
	switch (component.kind) {
		case "part":
			return `::part(${component.names.map(printIdentifier).join(" ")})`;
		case "slotted":
			return `::slotted(${printSelector(component.selector)})`;
		case "cue-function":
			return `::cue(${printSelector(component.selector)})`;
		case "cue-region-function":
			return `::cue-region(${printSelector(component.selector)})`;
		case "highlight-function":
			return `::highlight(${printIdentifier(component.name)})`;
		default:
			return printKeyword(LEGACY_PSEUDO_ELEMENTS.has(component.kind) ? ":" : "::", component);
	}
}

function printComponent(component: Component): string {
	switch (component.type) {
		case "combinator":
			return COMBINATORS[component.value] ?? unsupported();
		case "universal":
			return "*";
		case "namespace":
			if (component.kind === "named") return `${printIdentifier(component.prefix)}|`;
			return component.kind === "any" ? "*|" : "|";
		case "type":
			return printIdentifier(component.name);
		case "id":
			return `#${printIdentifier(component.name)}`;
		case "class":
			return `.${printIdentifier(component.name)}`;
		case "attribute": {
			const { namespace, operation } = component;
			let name = printIdentifier(component.name);
			if (namespace) {
				name = `${namespace.type === "any" ? "*" : printIdentifier(namespace.prefix)}|${name}`;
			}
			if (!operation) return `[${name}]`;
			const caseSensitivity = operation.caseSensitivity ? (CASE_SENSITIVITY[operation.caseSensitivity] ?? "") : "";
			return `[${name}${ATTRIBUTE_OPERATORS[operation.operator]}${printString(operation.value)}${caseSensitivity}]`;
		}
		case "pseudo-class":
			return printPseudoClass(component);
		case "pseudo-element":
			return printPseudoElement(component);
		case "nesting":
			return "&";
		default:
			return unsupported();
	}
}

function printSelector(selector: Selector): string {
	return selector.map(printComponent).join("");
}

function printSelectorList(selectors: SelectorList): string {
	return selectors.map(printSelector).join(", ");
}

/**
 * Print selectors with Lightning CSS by swapping them into a known rule, then
 * removing the known declaration block. Splitting at a brace would truncate
 * selectors whose attribute values contain braces.
 */
function printWithLightningCss(selectors: SelectorList): string {
	const declarations = " {\n  --diagnostic: 0;\n}\n";
	const { code } = transform({
		filename: "global-composes-selector.css",
		code: new TextEncoder().encode("a{--diagnostic:0}"),
		visitor: {
			Rule: {
				style(rule) {
					if (rule.type === "style") {
						rule.value.selectors = selectors;
						return stripNullValues(rule);
					}
					return undefined;
				},
			},
		},
	});
	return code.toString().slice(0, -declarations.length);
}

/** Reported when neither printer can print a selector. */
export const UNKNOWN_SELECTOR = "<unknown selector>";

/**
 * Print a parsed selector list using Lightning CSS's unminified formatting.
 *
 * Common selectors are printed in JS, because running a nested Lightning CSS
 * transform for each rule is expensive. The JS printer keeps the selector as
 * parsed, without the simplifications Lightning CSS applies to its own output
 * (`a:is(.b)` stays as written instead of becoming `a.b`). Components it does
 * not handle, such as vendor-prefixed or custom pseudo-classes, fall back to
 * Lightning CSS and print exactly as Lightning CSS prints them.
 *
 * This only builds diagnostics, so it never throws: if both printers fail, for
 * example on an AST shape from an unexpected Lightning CSS version, it returns
 * `UNKNOWN_SELECTOR`.
 */
export function formatSelectors(selectors: SelectorList): string {
	try {
		return printSelectorList(selectors);
	} catch {
		// Either a component the JS printer leaves to Lightning CSS, or an unexpected AST shape.
	}
	try {
		return printWithLightningCss(selectors);
	} catch {
		return UNKNOWN_SELECTOR;
	}
}
