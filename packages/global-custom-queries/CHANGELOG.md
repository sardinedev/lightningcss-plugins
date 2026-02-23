# @sardine/lightningcss-plugin-global-custom-queries

## 1.1.0

### Minor Changes

- 70f670b: Adds support for lightningcss@1.31.1
- fbd67f6: feat: Resolve custom media queries inside `not` and compound `and`/`or` conditions

  Previously the plugin only resolved `@custom-media` names when they appeared as the sole, top-level condition of a media query:

  ```css
  /* ✅ worked before */
  @media (--breakpoint) { … }
  ```

  The following shapes were silently left unresolved:

  ```css
  /* ❌ not resolved before */
  @media not (--breakpoint) { … }
  @media (--breakpoint) and (color) { … }
  ```

  The plugin now recursively walks the full `MediaCondition` tree, handling all three condition shapes from the CSS Media Queries spec:

  - **`feature`** — direct `(--name)` reference (existing behaviour)
  - **`not`** — negation wrapping a custom feature, e.g. `not (--breakpoint)`
  - **`operation`** — AND / OR compound conditions containing custom features, e.g. `(--breakpoint) and (color)`

  ```css
  /* tokens.css */
  @custom-media --breakpoint (width <= 100em);
  ```

  ```css
  /* input */
  @media not (--breakpoint) {
    .a {
      color: red;
    }
  }
  @media (--breakpoint) and (color) {
    .a {
      color: red;
    }
  }
  ```

  ```css
  /* output */
  @media (width > 100em) {
    .a {
      color: red;
    }
  }
  @media (width <= 100em) and (color) {
    .a {
      color: red;
    }
  }
  ```

  Note: LightningCSS simplifies `not (width <= 100em)` to `(width > 100em)` during minification — both are equivalent with the modern range syntax.

## 1.0.1

### Patch Changes

- 571183a: fix: remove node path

## 1.0.0

### Major Changes

- 6813372: A plugin to resolve Custom Media Queries declared in a external file
