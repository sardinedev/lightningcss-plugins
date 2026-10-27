---
"@sardine/lightningcss-plugin-source": major
---

Index global classes in `CssSource.classes` so `@sardine/lightningcss-plugin-global-composes` can reuse a shared source handle. Loading errors now keep the Lightning CSS error as `cause`.

Breaking changes:

- `CssSource` has a new required `classes` property. TypeScript code that builds `CssSource` objects by hand, such as test doubles, must add it.
