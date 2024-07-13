import { composeVisitors, transform } from "lightningcss";
import { expect, it } from "vitest";
import globalCustomQueries from "./globalCustomQueries";

it("should do things", () => {
	const res = transform({
		filename: "test.css",
		minify: true,
		code: Buffer.from(" "),
		visitor: composeVisitors([globalCustomQueries({})]),
	});

	const actual = res.code.toString();
	const expected = "";

	expect(actual).toBe(expected);
});
