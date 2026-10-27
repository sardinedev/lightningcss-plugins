# @sardine/lightningcss-plugin-global-composes

A [Lightning CSS](https://lightningcss.dev/) plugin that does things to CSS.

## Use case

A LightningCSS plugin to compose selectors

Similar to the `composes` [property in CSS Modules](https://github.com/css-modules/css-modules/blob/master/docs/composition.md), this plugin allows you to compose selectors in a global context.

Unlike CSS Modules `composes`, this plugin expects a `@` symbol before, `@composes` to avoid any confusion with a possible CSS spec in the future.

## Installation

```bash
npm install --save-dev @sardine/lightningcss-plugin-global-composes
```

## How to use

```js
import { bundle, composeVisitors } from "lightningcss";
import globalComposes from "@sardine/lightningcss-plugin-global-composes";

const { code } = bundle({
  filename: "style.css",
  minify: true,
  visitor: composeVisitors([globalComposes({ source: "./css/globals.css" })]),
});
```

### Multiple source files

Pass an array to compose classes from several files with one visitor:

```js
globalComposes({
  source: ["./css/globals.css", "./css/typography.css"],
});
```

Files are bundled and indexed in array order. If a class appears in more than one file, the later file's entire declaration block wins, including its `!important` declarations; properties are not merged across files. Classes unique to any source remain available.

A string `source` continues to work as before. An empty array creates an empty class index. Missing or invalid source files throw an error identifying the file that failed.

Use one visitor with an array instead of chaining several `globalComposes` visitors: each visitor removes the `@composes` rules it processes, even when it cannot resolve them. Resolving `@composes` inside source files themselves (transitive composition) is not supported.

### Share a source with other plugins

This plugin parses source paths with `@sardine/lightningcss-plugin-source`. When other plugins read the same CSS file, create one parsed source handle and pass it to each plugin. Install the source package directly if you import `createCssSource` yourself:

```bash
npm install --save-dev @sardine/lightningcss-plugin-source
```

```js
import { createCssSource } from "@sardine/lightningcss-plugin-source";
import globalComposes from "@sardine/lightningcss-plugin-global-composes";
import globalCustomQueries from "@sardine/lightningcss-plugin-global-custom-queries";
import { composeVisitors } from "lightningcss";

const source = createCssSource("./css/globals.css");

const visitor = composeVisitors([
  globalCustomQueries({ source }),
  globalComposes({ source: [source, "./css/typography.css"] }),
]);
```

The file is read and parsed once. Handles and paths can be mixed in the `source` array and follow the same later-source-wins order. Handles need `@sardine/lightningcss-plugin-source` 2.0 or later, which adds the `classes` index; older handles throw an error.

## Composition order

Composed declarations are placed before the rule's own declarations, so the rule's own declarations win over composed declarations of the same importance. Composed `!important` declarations still override the rule's normal declarations, as in regular CSS. When several classes set the same property, the class composed last wins, both within one `@composes` and across several:

```css
/* globals.css: .red { color: red; } .blue { color: blue; } .important-red { color: red !important; } */
.a { @composes red blue; }                    /* color: blue */
.b { @composes blue; @composes red; }         /* color: red */
.c { color: green; @composes red; }           /* color: green */
.d { color: green; @composes important-red; } /* color: red !important */
```

## Unresolved classes

When a composed class does not exist in any source, the plugin calls `console.warn` with the missing name, the consuming selector, and the line and column of that rule in the file being transformed:

```text
[@sardine/lightningcss-plugin-global-composes]: class "label-sm-bold" not found in source (composed in ".button--small" at line 12, column 1)
```

When bundling, rules from imported files also name the file's index in the bundle, which matches the order of `sources` in the bundle's source map (0 is the entry file):

```text
[@sardine/lightningcss-plugin-global-composes]: class "label-sm-bold" not found in source (composed in ".button--small" at line 12, column 1 of bundled file 2)
```

Selectors are printed from the parsed selector with Lightning CSS's unminified formatting. They keep the form you wrote rather than the simplified form Lightning CSS may output, so `a:is(.b)` is reported as `a:is(.b)`, not `a.b`. Nested rules show their own selector, such as `&:hover`; use the line and column to find the parent.

Each missing name is reported once per consuming rule. The unresolved `@composes` rule is still removed, existing declarations are preserved, and other resolved names are composed normally. These console warnings are separate from Lightning CSS's returned `warnings` array.

Pass `onUnresolved` to handle missing classes yourself, for example to route them to your build tool's logger, fail the build, or silence them:

```js
globalComposes({
  source: "./css/globals.css",
  onUnresolved({ name, selector, loc }) {
    throw new Error(`Unknown class "${name}" in ${selector} at line ${loc.line + 1}`);
  },
});
```

The callback receives:

- `name`: the class listed in `@composes`.
- `selector`: the consuming rule's selector list as a string, as shown in the default warning. It is built when first read, so callbacks that ignore it don't pay for it.
- `loc`: the consuming rule's Lightning CSS location. `line` starts at 0, `column` starts at 1, and `source_index` is the file's position in the bundle's source map `sources` (0 is the entry file).

Throwing from `onUnresolved` fails the Lightning CSS transform. Pass `() => {}` to silence the reports.

## Avoiding unknown at-rule warnings

By default, LightningCSS will emit a warning when it encounters the `@composes` at-rule: `[lightningcss] Unknown at rule: @composes`. This happens because `@composes` is parsed as an unknown at-rule before the plugin can process it.

To avoid the native warning, configure LightningCSS to recognize `@composes` as a custom at-rule. The plugin's unresolved-class warnings remain enabled:

```js
import { transform, composeVisitors } from "lightningcss";
import globalComposes, { globalComposesCustomAtRules } from "@sardine/lightningcss-plugin-global-composes";

const { code } = transform({
  filename: "style.css",
  minify: true,
  code: Buffer.from(css),
  customAtRules: {
    ...globalComposesCustomAtRules,
  },
  visitor: composeVisitors([globalComposes({ source: "./css/globals.css" })]),
});
```

### With Vite

When using Vite with the `lightningcss` CSS transformer:

```js
// vite.config.js
import { defineConfig } from 'vite';
import { globalComposesCustomAtRules } from '@sardine/lightningcss-plugin-global-composes';

export default defineConfig({
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      customAtRules: {
        ...globalComposesCustomAtRules,
      },
    },
  },
});
```

## Development

### Running Tests

```bash
npm test
```

### Running Benchmarks

Benchmarks are available to measure performance characteristics of the plugin:

```bash
npm run bench
```

Or run benchmarks directly with Vitest:

```bash
npx vitest bench --run
```

The benchmark suite includes stress tests with 60+ utility classes to simulate real-world usage patterns and help identify performance bottlenecks.
