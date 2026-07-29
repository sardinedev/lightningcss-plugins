# @sardine/lightningcss-plugin-custom-property-fallback

A [Lightning CSS](https://lightningcss.dev/) plugin that adds values from a shared custom-property file as `var()` fallbacks. It keeps runtime theming intact while giving each known variable a concrete fallback for browsers or contexts where the custom property is unavailable.

- **Native CSS values.** Fallbacks remain Lightning CSS tokens, including functions, colors, lists, and nested `var()` references.
- **Non-destructive.** Existing fallbacks are preserved and unknown variables are left unchanged.
- **Indexed once.** The source file is parsed when the plugin is configured, not once per declaration.

```css
/* tokens.css */
:root { --space-md: 16px; }

/* Input */
.card { margin: var(--space-md); }

/* Output */
.card { margin: var(--space-md, 16px); }
```

## Use case

Keep design tokens in one CSS file while adding their current values as fallbacks throughout component CSS:

```css
/* tokens.css */
:root {
	--space-md: 16px;
	--card-shadow: 0 1px 4px rgb(0 0 0 / 20%);
}
```

The custom property remains in the output, so it can still be overridden at runtime. Only its fallback is added.

## Installation

```bash
npm install --save-dev @sardine/lightningcss-plugin-custom-property-fallback
```

## Usage

```ts
import { composeVisitors, transform } from "lightningcss";
import customPropertyFallback from "@sardine/lightningcss-plugin-custom-property-fallback";

const { code } = transform({
	filename: "component.css",
	code: Buffer.from(".card { margin: var(--space-md); }"),
	visitor: composeVisitors([
		customPropertyFallback({ source: "./src/tokens.css" }),
	]),
});
```

### Share a source with other plugins

When multiple plugins read the same CSS file, create one parsed source handle and pass it to each plugin:

```bash
npm install --save-dev @sardine/lightningcss-plugin-source
```

```ts
import { createCssSource } from "@sardine/lightningcss-plugin-source";
import customPropertyFallback from "@sardine/lightningcss-plugin-custom-property-fallback";
import globalCustomQueries from "@sardine/lightningcss-plugin-global-custom-queries";
import { composeVisitors } from "lightningcss";

const source = createCssSource("./src/tokens.css");

const visitor = composeVisitors([
	globalCustomQueries({ source }),
	customPropertyFallback({ source }),
]);
```

The file is read and parsed once. Each plugin reuses the relevant index from the handle.

### With Vite

```ts
import { composeVisitors } from "lightningcss";
import { defineConfig } from "vite";
import customPropertyFallback from "@sardine/lightningcss-plugin-custom-property-fallback";

export default defineConfig({
	css: {
		transformer: "lightningcss",
		lightningcss: {
			visitor: composeVisitors([
				customPropertyFallback({ source: "./src/tokens.css" }),
			]),
		},
	},
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `source` | `string \| CustomPropertySource` | CSS file path or a shared source handle containing custom property values. |

## Behavior

- Custom properties from every selector in the source file are indexed.
- When a property is declared more than once, the last declaration encountered wins.
- `var(--name, existing)` keeps its existing fallback.
- `var(--unknown)` remains unchanged when `--unknown` is absent from the source.
- Source values may be normalized when Lightning CSS serializes the output, such as converting a color to a shorter equivalent form.

> The source is treated as an ordered token dictionary. The plugin does not reproduce runtime selector specificity, inheritance, media conditions, or other cascade behavior when choosing a fallback.


