---
"@sardine/lightningcss-plugin-global-composes": patch
---

fix: Preserve `!important` declarations from composed classes

The lightningcss AST represents a declaration block with two separate arrays:
`declarations` (normal properties) and `importantDeclarations` (`!important` properties).

Previously, the injection code only copied the `declarations` array, so any `!important`
property in a composed class was silently dropped. Additionally, if a composed class
contained _only_ `!important` declarations, the injection guard would short-circuit and
the entire composition would be skipped — leaving the consuming rule completely unchanged
with no warning.

Both arrays are now copied when injecting composed declarations, preserving `!important`
priorities as authored.
