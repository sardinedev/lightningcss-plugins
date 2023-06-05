# @sardine/lightningcss-plugin-url-composer

A [Lightning CSS](https://lightningcss.dev/) plugin to compose urls in CSS.

## Use case

If you have multiple environments for your website, you may want to load different assets depending on the environment. For example, you may want to load `https://sardine.dev/logo-in-red.svg` in development and `https://sardine.com/logo.svg` in production.

Or you may want to point at different domains, for example, `https://dev.sardine.dev/images/logo.svg` in development and `https://cdn.sardine.com/images/logo.svg` in production.

The sky is the limit.

## Installation

```bash
npm install --save-dev @sardine/lightningcss-plugin-url-composer
```

## How to use

```javascript
import { composeVisitors, transform } from "lightningcss";
import urlComposer from "@sardine/lightningcss-plugin-url-composer";

const res = transform({
  minify: true,
  code: Buffer.from("body { background: url(${URL}/logo.svg); }"),
  visitor: composeVisitors([urlComposer({ URL: "https://sardine.dev" })]),
});

const css = res.code.toString();

console.log(css);
// body{background:url(https://sardine.dev/logo.svg)}
```
