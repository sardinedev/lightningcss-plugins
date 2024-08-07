import type { Url } from "lightningcss";
type urlComposerOptions = Record<string, string>;

/**
 * @param mappping An object with key value pairs to replace in the url
 * @returns A visitor that replaces the url
 * @example
 * const res = transform({
 *  minify: true,
 *  code: Buffer.from("body { background: url(${URL}/logo.svg); }"),
 *  visitor: composeVisitors([urlComposer({ URL: "https://sardine.dev" })]),
 * });
 *
 * assert.strictEqual(
 *  res.code.toString(),
 *  "body{background:url(https://sardine.dev/logo.svg)}",
 *  new TypeError("Replaced URL is not the same")
 * );
 */
export default (mappping: urlComposerOptions) => ({
	Url(visitor: Url): Url {
		for (const [key, value] of Object.entries(mappping)) {
			const replacementKey = `\${${key}}`;
			if (visitor.url.includes(replacementKey)) {
				visitor.url = visitor.url.replace(replacementKey, value);
			}
		}

		return visitor;
	},
});
