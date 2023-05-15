import assert from "node:assert/strict";
import { composeVisitors, transform } from "lightningcss";
import urlComposer from "./urlComposer.mjs";

const res = transform({
  minify: true,
  code: Buffer.from("body { background: url(${URL}/logo.svg); }"),
  visitor: composeVisitors([urlComposer({ URL: "https://lego.com" })]),
});

assert.strictEqual(
  res.code.toString(),
  "body{background:url(https://lego.com/logo.svg)}",
  new TypeError("Replaced URL is not the same")
);
