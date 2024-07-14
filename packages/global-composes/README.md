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
