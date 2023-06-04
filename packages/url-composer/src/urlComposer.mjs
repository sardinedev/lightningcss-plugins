/**
 * @typedef {Object.<string, string>} mappping - A case sensitive key value pair
 */

/**
 * @param {mappping} mappping - An object with key value pairs to replace in the url
 * @returns {import('lightningcss').Visitor} - A visitor that replaces the url
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
export default (mappping) => ({
	/**
	 * @param {import('lightningcss').Url} url - The url object to transform
	 * @returns {import('lightningcss').Url} - The transformed url object
	 */
	Url(url) {
		for (const [key, value] of Object.entries(mappping)) {
			const replacementKey = `\${${key}}`;
			if (url.url.includes(replacementKey)) {
				url.url = url.url.replace(replacementKey, value);
			}
		}

		return url;
	},
});
