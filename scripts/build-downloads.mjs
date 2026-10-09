/**
 * Builds the single-file downloadable bundles in `downloads/` from the compiled ESM output.
 *
 * The library is a single runtime module with no dependencies and no imports, so the bundles are
 * produced by rewriting that module rather than by running a bundler:
 *
 *   downloads/tse-data-classes.js      UMD  - `<script>` tag, CommonJS `require`, or an AMD loader
 *   downloads/tse-data-classes.esm.js  ESM  - `<script type="module">` or a native `import`
 *   downloads/tse-data-classes.d.ts    Types - optional, for editor completion in plain JS
 *
 * Run `npm run build` first: this script reads `dist/esm` and fails if it is missing.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ESM_DIR = join(ROOT, "dist", "esm");
const OUT_DIR = join(ROOT, "downloads");

/** Name the UMD build attaches to `window` when loaded from a plain `<script>` tag. */
const GLOBAL_NAME = "TSEDataClasses";

/** Matches a top-level exported declaration, capturing the exported name. */
const EXPORT_DECL = /^export\s+(?:var|let|const|class|function|async function)\s+([A-Za-z_$][\w$]*)/gm;

/** Matches the sourcemap comment tsc appends; the bundles ship without maps. */
const SOURCEMAP_COMMENT = /^\/\/# sourceMappingURL=.*$/gm;

/** Matches the local type-only import in the generated declaration file. */
const LOCAL_TYPE_IMPORT = /^import\s+\{[\s\S]*?\}\s+from\s+"\.\/[^"]+";$/gm;

const read = (name) => {
  try {
    return readFileSync(join(ESM_DIR, name), "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`Missing ${join("dist", "esm", name)}. Run "npm run build" first.`);
    }
    throw err;
  }
};

/**
 * Confirms the compiled module is shaped the way the rewrites below assume: a single module whose
 * every export is a plain top-level declaration.  A future source change that breaks that assumption
 * fails here rather than producing a silently broken bundle.
 *
 * @param source The compiled module body.
 */
const assertBundlable = (source) => {
  const unsupported = source
    .split("\n")
    .map((line, idx) => ({ line, lineNumber: idx + 1 }))
    .filter(({ line }) => /^\s*(import\s|export\s)/.test(line))
    .filter(({ line }) => !/^export\s+(?:var|let|const|class|function|async function)\s/.test(line));

  if (unsupported.length > 0) {
    const details = unsupported.map(({ line, lineNumber }) => `  line ${lineNumber}: ${line.trim()}`).join("\n");
    throw new Error(
      "The compiled module uses import/export forms this script cannot rewrite:\n" +
        `${details}\n` +
        "Update scripts/build-downloads.mjs (or introduce a bundler) before releasing the downloads.",
    );
  }
};

/**
 * @param version The package version, recorded in each bundle so a downloaded copy can be identified.
 * @param format Human-readable format label for the banner.
 */
const banner = (version, format) =>
  [
    "/*!",
    ` * tse-data-classes ${version} - ${format} build`,
    " * Classes to normalize and work with ThoughtSpot data payloads.",
    " * Copyright ThoughtSpot, Inc.  See LICENSE.md for license terms.",
    " * https://github.com/thoughtspot/tse-data-classes",
    " *",
    " * Generated file - do not edit.  Built by scripts/build-downloads.mjs.",
    " */",
    "",
  ].join("\n");

/**
 * Wraps the module body in a UMD factory so the bundle works as a global script, a CommonJS module,
 * and an AMD module.  Exported declarations keep their names inside the factory, so references
 * between them are unaffected; only the `export` keyword is removed.
 *
 * @param body The compiled module body.
 * @param exportedNames Names to expose on the resulting namespace.
 */
const toUmd = (body, exportedNames) => {
  const factoryBody = body.replace(/^export\s+/gm, "");
  const namespace = exportedNames.map((name) => `    ${name},`).join("\n");

  return [
    "(function (root, factory) {",
    '  if (typeof exports === "object" && typeof module !== "undefined") {',
    "    module.exports = factory();",
    '  } else if (typeof define === "function" && define.amd) {',
    "    define(factory);",
    "  } else {",
    `    root.${GLOBAL_NAME} = factory();`,
    "  }",
    '})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function () {',
    '  "use strict";',
    "",
    factoryBody.trimEnd(),
    "",
    "  return {",
    namespace,
    "  };",
    "});",
    "",
  ].join("\n");
};

const main = () => {
  const { version } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

  const source = read("tse-data-classes.js").replace(SOURCEMAP_COMMENT, "").trimEnd();
  assertBundlable(source);

  const exportedNames = [...source.matchAll(EXPORT_DECL)].map((match) => match[1]);
  if (exportedNames.length === 0) {
    throw new Error("No exports found in the compiled module; the downloads would be empty.");
  }

  const declarations = [
    read("tse-data-classes-types.d.ts"),
    read("tse-data-classes.d.ts").replace(LOCAL_TYPE_IMPORT, ""),
  ]
    .join("\n")
    .replace(SOURCEMAP_COMMENT, "")
    .trimEnd();

  mkdirSync(OUT_DIR, { recursive: true });

  const outputs = [
    ["tse-data-classes.js", banner(version, "UMD") + toUmd(source, exportedNames)],
    ["tse-data-classes.esm.js", `${banner(version, "ES module")}${source}\n`],
    ["tse-data-classes.d.ts", `${banner(version, "type declarations")}${declarations}\n`],
  ];

  for (const [name, contents] of outputs) {
    writeFileSync(join(OUT_DIR, name), contents);
    console.log(`downloads/${name} (${(contents.length / 1024).toFixed(1)} kB)`);
  }

  console.log(`Bundled ${exportedNames.length} exports at version ${version}.`);
};

main();
