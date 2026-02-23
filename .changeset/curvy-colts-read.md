---
"@sardine/lightningcss-plugin-url-composer": patch
---

Fix a bug where only the first occurrence of a placeholder was replaced when
the same key appeared more than once inside a single `url()` value.

For example, `url(${CDN}/${VERSION}/assets/${VERSION}/logo.svg)` with `{ CDN: "https://cdn.example.com", VERSION: "v1" }`
previously produced `url(https://cdn.example.com/v1/assets/${VERSION}/logo.svg)`.
It now correctly produces `url(https://cdn.example.com/v1/assets/v1/logo.svg)`.
