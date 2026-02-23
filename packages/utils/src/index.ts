/**
 * Recursively remove `null`-valued keys from an object tree.
 *
 * lightningcss ≥1.30.2 changed how it deserialises Rust `Option<T>` fields that
 * arrive back from JavaScript: a `None` value **must** now be represented as a
 * missing key, not as `null`. However, lightningcss's own serialiser (Rust→JS)
 * still emits `null` for those absent optional fields (e.g.
 * `DashedIdentReference.from` and `Variable.fallback`).
 *
 * When we capture AST nodes from `bundle()` and then return them from a
 * *different* `transform()` visitor call, those stale `null` fields trip the
 * deserialiser with:
 *   "failed to deserialize; expected an object-like struct named Specifier, found ()"
 *
 * Stripping every `null`-valued key before storing nodes makes the objects safe
 * to re-inject.
 *
 * @see https://github.com/parcel-bundler/lightningcss/issues/1081
 */
export function stripNullValues<T>(value: T): T {
	if (value === null || value === undefined) return value;
	if (Array.isArray(value)) {
		return value.map(stripNullValues) as unknown as T;
	}
	if (typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			if (v !== null) {
				out[k] = stripNullValues(v);
			}
		}
		return out as T;
	}
	return value;
}
