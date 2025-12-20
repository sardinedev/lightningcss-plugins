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
import { transform } from "lightningcss";
import globalComposes from "@sardine/lightningcss-plugin-global-composes";

const { code } = bundle({
  filename: "style.css",
  minify: true,
  visitor: composeVisitors([globalComposes({ source: "./css/globals.css" })]),
});
```

## Avoiding warnings

By default, LightningCSS will emit a warning when it encounters the `@composes` at-rule: `[lightningcss] Unknown at rule: @composes`. This happens because `@composes` is parsed as an unknown at-rule before the plugin can process it.

To avoid this warning, you can configure LightningCSS to recognize `@composes` as a custom at-rule:

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
