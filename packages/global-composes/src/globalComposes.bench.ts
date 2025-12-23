import path from "node:path";
import { composeVisitors, transform } from "lightningcss";
import { bench, describe } from "vitest";
import globalComposes, { globalComposesCustomAtRules } from "./globalComposes";

describe("globalComposes performance", () => {
	const mockPath = path.join(__dirname, "./mocks/compose.css");
	const stressTestPath = path.join(__dirname, "./mocks/stress-test.css");

	bench("single @composes from small file", () => {
		const source = `
			.foo {
				@composes bar;
			}
		`;

		transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: mockPath })]),
		});
	});

	bench("multiple @composes from small file", () => {
		const source = `
			.foo {
				@composes bar;
				@composes small;
			}
		`;

		transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: mockPath })]),
		});
	});

	bench("single @composes from large file (60 classes)", () => {
		const source = `
			.component {
				@composes utility-1;
			}
		`;

		transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: stressTestPath })]),
		});
	});

	bench("10 selectors composing from large file", () => {
		const source = `
			.component-1 { @composes utility-1; }
			.component-2 { @composes utility-2; }
			.component-3 { @composes utility-3; }
			.component-4 { @composes utility-4; }
			.component-5 { @composes utility-5; }
			.component-6 { @composes utility-6; }
			.component-7 { @composes utility-7; }
			.component-8 { @composes utility-8; }
			.component-9 { @composes utility-9; }
			.component-10 { @composes utility-10; }
		`;

		transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: stressTestPath })]),
		});
	});

	bench("many @composes in single selector", () => {
		const source = `
			.component {
				@composes utility-1;
				@composes utility-2;
				@composes utility-3;
				@composes utility-4;
				@composes utility-5;
				@composes utility-6;
				@composes utility-7;
				@composes utility-8;
				@composes utility-9;
				@composes utility-10;
			}
		`;

		transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: stressTestPath })]),
		});
	});

	bench("complex: 20 selectors with multiple @composes each", () => {
		const source = `
			.comp-1 { @composes utility-1; @composes utility-2; }
			.comp-2 { @composes utility-3; @composes utility-4; }
			.comp-3 { @composes utility-5; @composes utility-6; }
			.comp-4 { @composes utility-7; @composes utility-8; }
			.comp-5 { @composes utility-9; @composes utility-10; }
			.comp-6 { @composes utility-11; @composes utility-12; }
			.comp-7 { @composes utility-13; @composes utility-14; }
			.comp-8 { @composes utility-15; @composes utility-16; }
			.comp-9 { @composes utility-17; @composes utility-18; }
			.comp-10 { @composes utility-19; @composes utility-20; }
			.comp-11 { @composes utility-21; @composes utility-22; }
			.comp-12 { @composes utility-23; @composes utility-24; }
			.comp-13 { @composes utility-25; @composes utility-26; }
			.comp-14 { @composes utility-27; @composes utility-28; }
			.comp-15 { @composes utility-29; @composes utility-30; }
			.comp-16 { @composes utility-31; @composes utility-32; }
			.comp-17 { @composes utility-33; @composes utility-34; }
			.comp-18 { @composes utility-35; @composes utility-36; }
			.comp-19 { @composes utility-37; @composes utility-38; }
			.comp-20 { @composes utility-39; @composes utility-40; }
		`;

		transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: stressTestPath })]),
		});
	});
});
