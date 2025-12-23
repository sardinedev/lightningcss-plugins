import path from "node:path";
import { composeVisitors, transform } from "lightningcss";
import { bench, describe } from "vitest";
import globalComposes, { globalComposesCustomAtRules } from "./globalComposes";

describe("globalComposes performance", () => {
	const mockPath = path.join(__dirname, "./mocks/compose.css");
	const stressPath = path.join(__dirname, "./mocks/stress.css");

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

	bench("single @composes from large file (50 classes)", () => {
		const source = `
			.component {
				@composes class1;
			}
		`;

		transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: stressPath })]),
		});
	});

	bench("10 selectors composing from large file", () => {
		const source = `
			.component-1 { @composes class1; }
			.component-2 { @composes class2; }
			.component-3 { @composes class3; }
			.component-4 { @composes class4; }
			.component-5 { @composes class5; }
			.component-6 { @composes class6; }
			.component-7 { @composes class7; }
			.component-8 { @composes class8; }
			.component-9 { @composes class9; }
			.component-10 { @composes class10; }
		`;

		transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: stressPath })]),
		});
	});

	bench("many @composes in single selector", () => {
		const source = `
			.component {
				@composes class1;
				@composes class2;
				@composes class3;
				@composes class4;
				@composes class5;
				@composes class6;
				@composes class7;
				@composes class8;
				@composes class9;
				@composes class10;
			}
		`;

		transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: stressPath })]),
		});
	});

	bench("complex: 20 selectors with multiple @composes each", () => {
		const source = `
			.comp-1 { @composes class1; @composes class2; }
			.comp-2 { @composes class3; @composes class4; }
			.comp-3 { @composes class5; @composes class6; }
			.comp-4 { @composes class7; @composes class8; }
			.comp-5 { @composes class9; @composes class10; }
			.comp-6 { @composes class11; @composes class12; }
			.comp-7 { @composes class13; @composes class14; }
			.comp-8 { @composes class15; @composes class16; }
			.comp-9 { @composes class17; @composes class18; }
			.comp-10 { @composes class19; @composes class20; }
			.comp-11 { @composes class21; @composes class22; }
			.comp-12 { @composes class23; @composes class24; }
			.comp-13 { @composes class25; @composes class26; }
			.comp-14 { @composes class27; @composes class28; }
			.comp-15 { @composes class29; @composes class30; }
			.comp-16 { @composes class31; @composes class32; }
			.comp-17 { @composes class33; @composes class34; }
			.comp-18 { @composes class35; @composes class36; }
			.comp-19 { @composes class37; @composes class38; }
			.comp-20 { @composes class39; @composes class40; }
		`;

		transform({
			filename: "test.css",
			minify: true,
			code: new TextEncoder().encode(source),
			customAtRules: {
				...globalComposesCustomAtRules,
			},
			visitor: composeVisitors([globalComposes({ source: stressPath })]),
		});
	});
});
