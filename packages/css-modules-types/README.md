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

## How to use

Call `cssModulesTypes` with the path to your CSS Modules file. An optional `output` path can be provided; if omitted, the `.d.ts` file is written next to the source file with a `.d.ts` suffix appended.

```ts
import cssModulesTypes from "@sardine/lightningcss-plugin-css-modules-types";

// Generates ./src/button.module.css.d.ts
cssModulesTypes({ source: "./src/button.module.css" });

// Or specify a custom output path
cssModulesTypes({
  source: "./src/button.module.css",
  output: "./src/button.module.css.d.ts",
});
```

The function also returns the generated declaration content as a string, which can be useful for programmatic use.

### With a Vite plugin

You can call `cssModulesTypes` inside a Vite plugin to automatically regenerate types on each CSS Modules file change:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import cssModulesTypes from "@sardine/lightningcss-plugin-css-modules-types";

export default defineConfig({
  plugins: [
    {
      name: "css-modules-types",
      handleHotUpdate({ file }) {
        if (file.endsWith(".module.css")) {
          cssModulesTypes({ source: file });
        }
      },
      buildStart() {
        cssModulesTypes({ source: "./src/button.module.css" });
      },
    },
  ],
});
```

## Development

### Running Tests

```bash
npm test
```
