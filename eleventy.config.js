import path from "node:path";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as yaml from "js-yaml";
import * as sass from "sass";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import { minify as minifyHtml } from "html-minifier-terser";

const require = createRequire(import.meta.url);
const liteLightDir = path.dirname(require.resolve("litelight-js/package.json"));

const isProduction = process.env.ELEVENTY_ENV === "production";

/** Format a date in UTC using a tiny subset of strftime used by the templates. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDate(value, format = "%b %-d, %Y") {
  const d = value === "now" ? new Date() : new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return format.replace(/%(-?)([a-zA-Z])/g, (_, noPad, token) => {
    switch (token) {
      case "Y": return d.getUTCFullYear();
      case "m": return noPad ? d.getUTCMonth() + 1 : pad(d.getUTCMonth() + 1);
      case "d": return noPad ? d.getUTCDate() : pad(d.getUTCDate());
      case "b": return MONTHS[d.getUTCMonth()];
      default: return _;
    }
  });
}

const stripHtml = (html = "") =>
  String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export default function (eleventyConfig) {
  // --- Plugins & libraries -------------------------------------------------
  const md = markdownIt({ html: true, linkify: false, typographer: true })
    // Posts are largely HTML exported from WordPress; indentation inside that
    // HTML must not be treated as Markdown code blocks.
    .disable("code")
    .use(markdownItAttrs, { allowedAttributes: ["id", "class", "target", "rel"] });
  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addDataExtension("yml,yaml", (contents) => yaml.load(contents));

  // --- Drafts: rendered by `npm start`, skipped by `npm run build` ---------
  eleventyConfig.addPreprocessor("drafts", "*", (data) => {
    if (data.draft && isProduction) return false;
  });

  // --- Cache busting ---------------------------------------------------------
  // Added to the CSS/JS URLs (`main.css?v=…`) so each deploy makes browsers
  // fetch the new files instead of reusing an old cached copy.
  eleventyConfig.addGlobalData("assetVersion", (process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 8));

  // --- Sass ----------------------------------------------------------------
  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    useLayouts: false,
    compile(inputContent, inputPath) {
      if (path.basename(inputPath).startsWith("_")) return;
      const result = sass.compileString(inputContent, {
        loadPaths: [path.dirname(inputPath), "src/_sass"],
        style: "compressed",
        silenceDeprecations: ["import", "global-builtin", "color-functions", "slash-div"],
        // `@import "litelight"` pulls in the lightbox styles. Its source uses CSS
        // nesting, so compile it as SCSS to flatten it for older browsers.
        importers: [{
          canonicalize: (url) => (url === "litelight" ? new URL("litelight:css") : null),
          load: () => ({ contents: readFileSync(path.join(liteLightDir, "lite-light.css"), "utf8"), syntax: "scss" }),
        }],
      });
      this.addDependencies(inputPath, result.loadedUrls);
      return () => result.css;
    },
  });
  eleventyConfig.ignores.add("src/_sass/**");
  eleventyConfig.addWatchTarget("src/_sass/");

  // --- Static files --------------------------------------------------------
  for (const dir of ["assets", "images", "img", "external", "press"]) {
    eleventyConfig.addPassthroughCopy(`src/${dir}`);
  }
  eleventyConfig.addPassthroughCopy({
    [path.join(liteLightDir, "dist/lite-light.min.js")]: "js/vendor/lite-light.min.js",
  });
  eleventyConfig.addPassthroughCopy("src/favicon.ico");
  eleventyConfig.addPassthroughCopy("src/googled1a42a0650e56875.html");
  eleventyConfig.ignores.add("src/googled1a42a0650e56875.html");
  eleventyConfig.addPassthroughCopy({ "src/img/mobile-icons/apple-touch-icon.png": "apple-touch-icon.png" });
  eleventyConfig.ignores.add("src/blog-images/**");
  eleventyConfig.ignores.add("src/external/mp3s/**");
  eleventyConfig.watchIgnores.add("src/external/mp3s/**");

  // --- Collections ---------------------------------------------------------
  const postGlob = "src/posts/**/*.{md,html}";
  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob(postGlob).sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("songStories", (api) =>
    api.getFilteredByGlob("src/song-stories/*.md")
  );
  eleventyConfig.addCollection("categories", (api) => {
    const map = new Map();
    for (const post of api.getFilteredByGlob(postGlob).sort((a, b) => b.date - a.date)) {
      for (const cat of post.data.categories || []) {
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat).push(post);
      }
    }
    return [...map].map(([name, posts]) => ({ name, posts }));
  });

  // --- Filters & shortcodes ------------------------------------------------
  eleventyConfig.addFilter("date", formatDate);
  eleventyConfig.addFilter("isoDate", (value) => new Date(value).toISOString());
  eleventyConfig.addFilter("stripHtml", stripHtml);
  eleventyConfig.addFilter("dateToRfc822", (value) => (value === "now" ? new Date() : new Date(value)).toUTCString());
  eleventyConfig.addFilter("absoluteUrl", (url, base) => new URL(url, base).href);
  // Make root-relative and protocol-relative links absolute (for the RSS feed).
  eleventyConfig.addFilter("htmlToAbsoluteUrls", (html, base) =>
    String(html || "")
      .replace(/(\s(?:href|src)=["'])\/\//g, "$1https://")
      .replace(/(\s(?:href|src)=["'])\/(?!\/)/g, `$1${new URL("/", base).href}`)
  );

  // Plain-text summary: explicit `excerpt` front matter, else the first paragraph.
  eleventyConfig.addFilter("excerpt", (content, explicit) => {
    if (explicit) return stripHtml(explicit);
    const html = String(content || "");
    const para = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    return stripHtml(para ? para[1] : html.split(/\n\s*\n/)[0]);
  });

  eleventyConfig.addShortcode(
    "youtube",
    (id) => `<div class="embed-responsive embed-responsive-16by9">
  <iframe class="embed-responsive-item" width="560" height="315" src="https://www.youtube.com/embed/${id}" title="YouTube video" frameborder="0" allowfullscreen loading="lazy"></iframe>
</div>`
  );

  // --- Production HTML minification (replaces Jekyll's compress layout) ----
  if (isProduction) {
    eleventyConfig.addTransform("minify-html", async function (content) {
      if (!(this.page.outputPath || "").endsWith(".html")) return content;
      return minifyHtml(content, {
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
      });
    });
  }

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_includes/layouts",
      data: "_data",
    },
    templateFormats: ["md", "html", "liquid", "njk", "11ty.js"],
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
  };
}
