# @sardine/lightningcss-plugin-source

Parse one CSS source file once and share its indexed values across Lightning CSS plugins. This avoids repeated filesystem reads and parsing when several plugins use the same tokens file.

- **One parse.** `createCssSource()` reads and bundles the source immediately.
- **Shared indexes.** Custom properties and `@custom-media` definitions are available from one handle.
- **Explicit lifetime.** The caller owns the handle, so there is no process-global cache or hidden invalidation behavior.

```ts
const source = createCssSource("./src/tokens.css");

composeVisitors([
	globalCustomQueries({ source }),
	customPropertyFallback({ source }),
]);
```

## Installation

```bash
npm install --save-dev @sardine/lightningcss-plugin-source
```

Install the Lightning CSS plugins that will consume the source handle separately.

## Usage

```ts
import { createCssSource } from "@sardine/lightningcss-plugin-source";
import customPropertyFallback from "@sardine/lightningcss-plugin-custom-property-fallback";
import globalCustomQueries from "@sardine/lightningcss-plugin-global-custom-queries";
import { composeVisitors, transform } from "lightningcss";

const source = createCssSource("./src/tokens.css");

const { code } = transform({
	filename: "component.css",
	code: Buffer.from(`
		@media (--narrow) {
			.card { margin: var(--space-md); }
		}
	`),
	visitor: composeVisitors([
		globalCustomQueries({ source }),
		customPropertyFallback({ source }),
	]),
});
```

## API

### `createCssSource(filename)`

Reads and parses `filename`, then returns a `CssSource` containing read-only indexes:

- `customMedia`: custom media names mapped to their parsed conditions.
- `customProperties`: custom property names mapped to their parsed token values.
- `filename`: the source path used to create the handle.

Custom properties are indexed in source order. When a property appears more than once, the last declaration wins.

### `resolveCssSource(source)`

Returns an existing `CssSource` unchanged or creates one when given a string path. Plugin authors can use this helper when accepting `CssSourceInput` directly.

> The handle is a snapshot. Create a new handle when the source file changes.
