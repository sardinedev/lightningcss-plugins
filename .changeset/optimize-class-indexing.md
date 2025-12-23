---
"@sardine/lightningcss-plugin-global-composes": patch
---

perf: Optimize class lookup by building an index once at initialization instead of scanning the AST for each @composes directive. This reduces complexity from O(N × R) to O(N + R), providing significant performance improvements for larger stylesheets.
