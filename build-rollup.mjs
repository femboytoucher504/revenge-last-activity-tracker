import { readFile, writeFile } from "fs/promises";
import { createHash } from "crypto";
import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";

const manifest = JSON.parse(await readFile("./manifest.json"));
const outPath = "./index.js";

try {
    const bundle = await rollup({
        input: `./src/${manifest.main}`,
        onwarn: () => {},
        plugins: [nodeResolve(), commonjs(), esbuild({ minify: true })],
    });

    await bundle.write({
        file: outPath,
        globals(id) {
            if (id.startsWith("@vendetta")) return id.substring(1).replace(/\//g, ".");
            const map = { react: "window.React" };
            return map[id] || null;
        },
        format: "iife",
        compact: true,
        exports: "named",
    });

    await bundle.close();

    const compiled = await readFile(outPath);
    manifest.hash = "sha256:" + createHash("sha256").update(compiled).digest("hex");
    manifest.main = "index.js";
    await writeFile("./manifest.json", JSON.stringify(manifest, null, 4));

    console.log(`Successfully built ${manifest.name}! New hash: ${manifest.hash}`);
} catch (e) {
    console.error("Build failed:", e);
    process.exit(1);
}
