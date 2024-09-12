import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const watch = process.argv.includes("--watch");
const dev = watch || process.argv.includes("--dev");

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: dev ? "inline" : false,
	treeShaking: true,
	outfile: "main.js",
	minify: !dev,
});

if (watch) {
	await context.watch();
} else {
	await context.rebuild();
	process.exit(0);
}
