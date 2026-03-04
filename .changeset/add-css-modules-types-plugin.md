---
"@sardine/lightningcss-plugin-css-modules-types": minor
---

New package: `@sardine/lightningcss-plugin-css-modules-types`

Adds a utility to generate TypeScript type declarations for CSS Modules files. Given a CSS Modules file it writes a `.d.ts` file that declares all exported class names as `readonly string` properties, enabling TypeScript to catch missing or incorrect class names and provide autocomplete.
