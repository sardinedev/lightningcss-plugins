---
"@sardine/lightningcss-plugin-global-composes": patch
---

Fix crash when processing rules with `var()` using lightningcss >=1.28.

In lightningcss 1.28+, `rule.value.rules` changed from `undefined` to `[]` for style rules without nested children. Since `[]` is truthy, the visitor was returning every style rule object — including ones containing `var()` tokens whose AST nodes have `null` optional fields. LightningCSS >=1.28 cannot deserialize `null` back to Rust `Option::None`, producing:

> failed to deserialize; expected an object-like struct named Specifier, found ()

The `Rule.style` visitor now only returns the rule when it was actually mutated by removing a `@composes` child rule, and returns `undefined` otherwise.
