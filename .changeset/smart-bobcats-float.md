---
"@sardine/lightningcss-plugin-global-composes": patch
---

Fix deserialization error with `var()` and `@import url()` in lightningcss ≥1.30.2.

lightningcss ≥1.30.2 changed how Rust `Option<T>` fields round-trip through JavaScript: absent optional fields must be missing keys, not `null`. The Rust serializer still emits `null` for those fields (e.g. `DashedIdentReference.from`, `Variable.fallback`), which caused a crash when declarations captured via `bundle()` were re-injected in a `transform()` visitor:

> `failed to deserialize; expected an object-like struct named Specifier, found ()`

This affected any source file using `var()`, CSS custom properties, or opening with `@import url()`. Fixed by stripping `null`-valued keys from captured AST nodes before caching them. See [lightningcss#1081](https://github.com/parcel-bundler/lightningcss/issues/1081).
