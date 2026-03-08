# @sardine/lightningcss-plugin-css-modules-types

A utility to generate TypeScript type declarations for CSS Modules files.

## Use case

When you import a CSS Modules file in a TypeScript project, TypeScript needs to know which class names the module exports. This tool parses your CSS Modules files using [Lightning CSS](https://lightningcss.dev/) and generates `.d.ts` declaration files so TypeScript can validate your class name usage and provide autocomplete.

Given a file `button.module.css`:

```css
.root {
  color: red;
}

.icon {
  font-size: 12px;
}
```

This tool generates `button.module.css.d.ts`:

```ts
declare const styles: {
  readonly "icon": string;
  readonly "root": string;
};
export default styles;
```

## Installation

```bash
npm install --save-dev @sardine/lightningcss-plugin-css-modules-types
```

## Usage

Add the plugin to your Lightning CSS visitors

```ts
import { composeVisitors, transform } from "lightningcss";
import cssModulesTypes from "@sardine/lightningcss-plugin-css-modules-types";

const { code } = transform({
  filename: "component.module.css",
  code: Buffer.from(`
    .root {
      color: red;
    }

    .icon {
      font-size: 12px;
    }
  `),
  cssModules: true,
  visitor: composeVisitors([
    cssModulesTypes(),
  ]),
});
// Writes component.module.css.d.ts
```

## Development

### Running Tests

```bash
npm test
```
