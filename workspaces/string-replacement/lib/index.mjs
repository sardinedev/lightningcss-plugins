import assert from "node:assert/strict";
import { composeVisitors, transform } from "lightningcss";

function urlComposer(mappping) {
  return {
    Url(url) {
      for (const [key, value] of Object.entries(mappping)) {
        const replacementKey = `\${${key}}`;
        if (url.url.includes(replacementKey)) {
          url.url = url.url.replace(replacementKey, value);
          return url;
        }
      }
    },
  };
}

const res = transform({
  minify: true,
  code: Buffer.from("body { background: url(${URL}/logo.svg); }"),
  visitor: composeVisitors([urlComposer({ URL: "https://lego.com" })]),
});
console.log(res.code.toString());
assert.strictEqual(
  res.code.toString(),
  "body{background:url(https://lego.com/logo.svg)}",
  new TypeError("Replaced URL is not the same")
);
