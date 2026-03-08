---
"@sardine/lightningcss-plugin-css-modules-types": major
---

New package: `@sardine/lightningcss-plugin-css-modules-types`

A LightningCSS visitor plugin that generates TypeScript type declarations for CSS Modules files. When added to LightningCSS visitors, it collects class names from selectors during AST traversal (before hashing) and writes a `.d.ts` file next to each `.module.css` source. Non-module CSS files are silently ignored.
