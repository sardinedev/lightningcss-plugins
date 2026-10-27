---
"@sardine/lightningcss-plugin-global-composes": major
---

Support multiple source files with later-file precedence and report unresolved `@composes` classes with the consuming selector, line and column, plus the file index when bundling (GH-252). Pass `onUnresolved` to route, fail on, or silence these reports; the default is `console.warn`. Source paths are now parsed with `@sardine/lightningcss-plugin-source`, which is a new dependency, and `source` also accepts its shared handles and readonly arrays. Source loading errors now identify the failing file and keep the Lightning CSS error as `cause`.

Breaking changes:

- When several composed classes set the same property, the class composed last now wins. Previously the first composed class won.
- `lightningcss` is now a peer dependency, requiring `>=1.32.0` to match `@sardine/lightningcss-plugin-source`.
