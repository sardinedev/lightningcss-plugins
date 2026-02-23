# @sardine/lightningcss-plugin-url-composer

## 1.2.0

### Minor Changes

- 70f670b: Adds support for lightningcss@1.31.1

### Patch Changes

- 5dbd08c: Fix a bug where only the first occurrence of a placeholder was replaced when
  the same key appeared more than once inside a single `url()` value.

  For example, `url(${CDN}/${VERSION}/assets/${VERSION}/logo.svg)` with `{ CDN: "https://cdn.example.com", VERSION: "v1" }`
  previously produced `url(https://cdn.example.com/v1/assets/${VERSION}/logo.svg)`.
  It now correctly produces `url(https://cdn.example.com/v1/assets/v1/logo.svg)`.

## 1.1.0

### Minor Changes

- 24dc07d: Export plugin types

## 1.0.1

### Patch Changes

- 6a89c9a: fix: Explicitly exports ESM module

## 1.0.0

### Major Changes

- be22aed: First release
