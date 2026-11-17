// Builds /js/main.js from src/js/scripts.js (minified in production).
import { readFile } from "node:fs/promises";
import { minify } from "terser";

export const data = {
  permalink: "/js/main.js",
  eleventyExcludeFromCollections: true,
};

export async function render({ isProduction }) {
  const code = await readFile(new URL("scripts.js", import.meta.url), "utf8");
  if (!isProduction) return code;
  const result = await minify(code, { module: true, compress: true, mangle: true });
  return result.code;
}
