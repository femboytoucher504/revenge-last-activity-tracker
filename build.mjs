import * as esbuild from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

await esbuild.build({
    entryPoints: ["src/index.js"],
    bundle: true,
    outfile: "index.js",
    format: "cjs",
    platform: "browser",
    target: "es2020",
    minify: true,
    external: ["@vendetta/*"],
});

const compiled = readFileSync("index.js");
const hash = createHash("sha256").update(compiled).digest("hex");

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
manifest.hash = `sha256:${hash}`;
writeFileSync("manifest.json", JSON.stringify(manifest, null, 4));

console.log("Built index.js — new hash:", manifest.hash);
