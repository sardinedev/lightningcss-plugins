# @sardine/lightningcss-plugin-global-composes

## 1.2.0

### Minor Changes

- 70f670b: Adds support for lightningcss@1.31.1

### Patch Changes

- 2d92e77: fix: Preserve `!important` declarations from composed classes

  The lightningcss AST represents a declaration block with two separate arrays:
  `declarations` (normal properties) and `importantDeclarations` (`!important` properties).

  Previously, the injection code only copied the `declarations` array, so any `!important`
  property in a composed class was silently dropped. Additionally, if a composed class
  contained _only_ `!important` declarations, the injection guard would short-circuit and
  the entire composition would be skipped — leaving the consuming rule completely unchanged
  with no warning.

  Both arrays are now copied when injecting composed declarations, preserving `!important`
  priorities as authored.

- 70f670b: Fix deserialization error with `var()` and `@import url()` in lightningcss ≥1.30.2.

  lightningcss ≥1.30.2 changed how Rust `Option<T>` fields round-trip through JavaScript: absent optional fields must be missing keys, not `null`. The Rust serializer still emits `null` for those fields (e.g. `DashedIdentReference.from`, `Variable.fallback`), which caused a crash when declarations captured via `bundle()` were re-injected in a `transform()` visitor:

  > `failed to deserialize; expected an object-like struct named Specifier, found ()`

  This affected any source file using `var()`, CSS custom properties, or opening with `@import url()`. Fixed by stripping `null`-valued keys from captured AST nodes before caching them. See [lightningcss#1081](https://github.com/parcel-bundler/lightningcss/issues/1081).

## 1.1.0

### Minor Changes

- 506023a: feat: Adds `globalComposesCustomAtRules` utility function to avoid warnings about unknown at rule @composes

### Patch Changes

- f9ca5e6: perf: Optimize class lookup by building an index once at initialization instead of scanning the AST for each @composes directive.

  ### Benchmark Results

  | Benchmark                                     | Before (ops/sec) | After (ops/sec) | Change   |
  | --------------------------------------------- | ---------------- | --------------- | -------- |
  | single @composes from small file              | 11,889           | 14,077          | **+18%** |
  | multiple @composes from small file            | 12,997           | 13,087          | ~same    |
  | single @composes from large file (60 classes) | 2,823            | 2,827           | ~same    |
  | 10 selectors composing from large file        | 2,060            | 2,042           | ~same    |
  | many @composes in single selector             | 2,381            | 2,388           | ~same    |
  | complex: 20 selectors with multiple @composes | 1,341            | 1,370           | **+2%**  |

  The optimization shows ~18% improvement on simple cases. More complex cases show similar performance as the indexing overhead balances with lookup savings at this scale. Benefits increase with larger source files (hundreds of classes).

## 1.0.1

### Patch Changes

- 571183a: fix: Removes node path

## 1.0.0

### Major Changes

- f0d5e41: A plugin to compose CSS declarations
