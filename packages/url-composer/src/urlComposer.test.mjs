import assert from "node:assert/strict";
import { composeVisitors, transform } from "lightningcss";
import urlComposer from "./urlComposer.mjs";

const res = transform({
  minify: true,
  code: Buffer.from("body { background: url(${URL}/logo.svg); }"),
  visitor: composeVisitors([urlComposer({ URL: "https://sardine.dev" })]),
});

assert.strictEqual(
  res.code.toString(),
  "body{background:url(https://sardine.dev/logo.svg)}",
  new TypeError("Replaced URL is not the same")
);
