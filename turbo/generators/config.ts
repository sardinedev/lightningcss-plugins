import fs from "node:fs";
import path from "node:path";
import type { PlopTypes } from "@turbo/gen";

export default function generator(plop: PlopTypes.NodePlopAPI): void {
	plop.setActionType("copy", (answers, config, plop) => {
		const src = plop.renderString(config.src, answers);
		const dest = plop.renderString(config.dest, answers);
		const dirname = path.dirname(dest);

		fs.mkdirSync(dirname, { recursive: true });
		fs.copyFileSync(path.resolve(__dirname, src), dest);
	});

	plop.setGenerator("plugin", {
		description: "Creates a new Lightning CSS plugin in the packages directory",
		prompts: [
			{
				type: "input",
				name: "name",
				message: "What is the name of the new pulgin?",
				validate: (input: string) => {
					if (input.includes(".")) {
						return "file name cannot include an extension";
					}
					if (input.includes(" ")) {
						return "file name cannot include spaces";
					}
					if (input.includes("lightningcss-plugin")) {
						return "the prefix 'lightningcss-plugin' is not needed";
					}
					if (!input) {
						return "file name is required";
					}
					return true;
				},
			},
			{
				type: "input",
				name: "description",
				message: "Add a brief description of the plugin",
				validate: (input: string) => {
					if (!input) {
						return "description is required";
					}
					return true;
				},
			},
		],
		actions: [
			{
				type: "add",
				path: "{{ turbo.paths.root }}/packages/{{ dashCase name }}/README.md",
				templateFile: "templates/readme.hbs",
			},
			{
				type: "add",
				path: "{{ turbo.paths.root }}/packages/{{ dashCase name }}/package.json",
				templateFile: "templates/package.json.hbs",
			},
			{
				type: "add",
				path: "{{ turbo.paths.root }}/packages/{{ dashCase name }}/vite.config.ts",
				templateFile: "templates/vite.config.ts.hbs",
			},
			{
				type: "add",
				path: "{{ turbo.paths.root }}/packages/{{ dashCase name }}/src/{{camelCase name }}.ts",
				templateFile: "templates/src/index.ts.hbs",
			},
			{
				type: "add",
				path: "{{ turbo.paths.root }}/packages/{{ dashCase name }}/src/{{camelCase name }}.test.ts",
				templateFile: "templates/src/index.test.ts.hbs",
			},
			{
				type: "modify",
				path: "{{ turbo.paths.root }}/packages/{{ dashCase name }}/src/{{camelCase name }}.test.ts",
				pattern: /\|NAME\|/g,
				template: "{{camelCase name}}",
			},
			{
				type: "modify",
				path: "{{ turbo.paths.root }}/packages/{{ dashCase name }}/vite.config.ts",
				pattern: /\|NAME\|/g,
				template: "{{camelCase name}}",
			},
			{
				type: "copy",
				src: "templates/tsconfig.json",
				dest: "{{ turbo.paths.root }}/packages/{{ dashCase name }}/tsconfig.json",
			},
			{
				type: "copy",
				src: "templates/tsconfig.export.json",
				dest: "{{ turbo.paths.root }}/packages/{{ dashCase name }}/tsconfig.export.json",
			},
		],
	});
}
