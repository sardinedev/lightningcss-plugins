# @sardine/lightningcss-plugin-source

## 3.0.0

### Major Changes

- 9d2cda8: Raise the minimum supported `lightningcss` peer dependency from `1.32.0` to `1.33.0`.

## 2.0.0

### Major Changes

- e528a75: Index global classes in `CssSource.classes` so `@sardine/lightningcss-plugin-global-composes` can reuse a shared source handle. Loading errors now keep the Lightning CSS error as `cause`.

  Breaking changes:

  - `CssSource` has a new required `classes` property. TypeScript code that builds `CssSource` objects by hand, such as test doubles, must add it.

## 1.0.0

### Major Changes

- 4519f30: Add an explicit shared source handle so multiple plugins can reuse one CSS file read and parse.
