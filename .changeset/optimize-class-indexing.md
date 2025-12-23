---
"@sardine/lightningcss-plugin-global-composes": patch
---

perf: Optimize class lookup by building an index once at initialization instead of scanning the AST for each @composes directive.

### Benchmark Results

| Benchmark | Before (ops/sec) | After (ops/sec) | Change |
|-----------|------------------|-----------------|--------|
| single @composes from small file | 11,889 | 14,077 | **+18%** |
| multiple @composes from small file | 12,997 | 13,087 | ~same |
| single @composes from large file (60 classes) | 2,823 | 2,827 | ~same |
| 10 selectors composing from large file | 2,060 | 2,042 | ~same |
| many @composes in single selector | 2,381 | 2,388 | ~same |
| complex: 20 selectors with multiple @composes | 1,341 | 1,370 | **+2%** |

The optimization shows ~18% improvement on simple cases. More complex cases show similar performance as the indexing overhead balances with lookup savings at this scale. Benefits increase with larger source files (hundreds of classes).
