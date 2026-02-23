# @sardine/lightningcss-plugin-global-custom-queries

A [Lightning CSS](https://lightningcss.dev/) plugin that resolves `@custom-media` queries globally. Define your custom media queries once in a shared CSS file and use them anywhere in your project — the plugin rewrites them to their resolved values at build time.

## Use case

[CSS Custom Media Queries](https://www.w3.org/TR/mediaqueries-5/#custom-mq) let you name a media condition and reuse it:

```css
/* tokens.css */
@custom-media --breakpoint (width <= 100em);
@custom-media --large (width >= 120em);
```

```css
/* component.css */
@media (--breakpoint) {
  .card { font-size: 14px; }
}

@media not (--breakpoint) {
  .card { font-size: 16px; }
}

@media (--breakpoint) and (color) {
  .card { color: red; }
}
```

This plugin resolves those references at build time, so the output is valid CSS that all browsers understand:

```css
@media (width <= 100em) {
  .card { font-size: 14px; }
}

@media (width > 100em) {
  .card { font-size: 16px; }
}

@media (width <= 100em) and (color) {
  .card { color: red; }
}
```

## Installation

```bash
npm install --save-dev @sardine/lightningcss-plugin-global-custom-queries
```

## Usage

```ts
import { composeVisitors, transform } from "lightningcss";
import globalCustomQueries from "@sardine/lightningcss-plugin-global-custom-queries";

const { code } = transform({
  filename: "component.css",
  code: Buffer.from(`
    @media (--breakpoint) {
      .card { font-size: 14px; }
    }
  `),
  visitor: composeVisitors([
    globalCustomQueries({ source: "./tokens.css" }),
  ]),
});
```

### With a bundler (e.g. Vite)

```ts
// vite.config.ts
import { composeVisitors } from "lightningcss";
import globalCustomQueries from "@sardine/lightningcss-plugin-global-custom-queries";

export default {
  css: {
    transformer: "lightningcss",
    lightningcss: {
      visitor: composeVisitors([
        globalCustomQueries({ source: "./src/tokens.css" }),
      ]),
    },
  },
};
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `source` | `string` | Path to the CSS file containing the `@custom-media` definitions to resolve from. |

## Supported query shapes

| Input | Resolved |
|-------|----------|
| `@media (--breakpoint)` | ✅ Direct feature reference |
| `@media not (--breakpoint)` | ✅ Negated condition |
| `@media (--breakpoint) and (color)` | ✅ AND / OR compound condition |
| `@media screen and (--breakpoint)` | ✅ Media type combined with custom feature |
| `@media (--unknown)` | ⏭️ Left unchanged — name not found in source file |
| `@media print` | ⏭️ Left unchanged — no custom feature present |
