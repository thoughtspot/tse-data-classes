# Single-File Downloads

Prebuilt, self-contained builds of `tse-data-classes` for projects that are not using npm or
TypeScript. Everything the library needs is in one file — there are no runtime dependencies and
nothing to install.

If you *are* using npm, install the package instead: `npm install tse-data-classes`. You get the same
code plus source maps and proper type resolution.

| File | Use it when |
| --- | --- |
| [`tse-data-classes.js`](tse-data-classes.js) | Loading with a plain `<script>` tag, `require()`, or an AMD loader. Exposes a `TSEDataClasses` global in the browser. |
| [`tse-data-classes.esm.js`](tse-data-classes.esm.js) | Loading with `<script type="module">` or a native `import`. |
| [`tse-data-classes.d.ts`](tse-data-classes.d.ts) | Optional. Put it beside the `.js` file to get autocomplete and inline docs in an editor, even in plain JavaScript. |

These are generated files — don't edit them. They are built from `src/` by
`scripts/build-downloads.mjs` (`npm run build:downloads`), and the version they were built from is in
the banner comment at the top of each file.

## Browser, script tag

Download `tse-data-classes.js`, put it next to your page, and every export lands on the
`TSEDataClasses` global:

```html
<script src="tse-data-classes.js"></script>
<script>
  const { createDataClass, isTabularData, tabularDataToHTML } = TSEDataClasses;

  // `payload` is whatever ThoughtSpot handed you — an embed event, or a Data API response.
  const data = createDataClass(payload);

  if (!data.isValid) {
    console.error("Could not read the payload:", data.errors);
  } else if (isTabularData(data)) {
    document.getElementById("results").innerHTML = tabularDataToHTML(data);
  }
</script>
```

Load it before your own scripts. If you would rather not download anything, a CDN can serve the same
file from the published package:

```html
<script src="https://cdn.jsdelivr.net/npm/tse-data-classes@2/downloads/tse-data-classes.js"></script>
```

Pin the major version (`@2`) as shown, or a full version (`@2.0.1`) if you want the file to never
change under you. Don't use `raw.githubusercontent.com` as a script source — it serves files as plain
text and browsers will refuse to run them.

## Browser, ES module

```html
<script type="module">
  import { createDataClass, DataClassType } from "./tse-data-classes.esm.js";

  const data = createDataClass(payload, DataClassType.SearchData);
  console.table(data.getDataAsObjects());
</script>
```

## Node, without npm

```javascript
const { createDataClass } = require("./tse-data-classes.js");
```

The same file works with `require()` because it ships as UMD. For `import` in Node, use
`tse-data-classes.esm.js` — Node may warn that the file's module type is unspecified, which is
harmless; installing the package from npm avoids the warning.

## Editor support without TypeScript

Keep `tse-data-classes.d.ts` in the same folder as the `.js` file you loaded and most editors will
pick it up automatically. If yours doesn't, point at it from the file that uses the library:

```javascript
/// <reference path="./tse-data-classes.d.ts" />
```

That gives you completion, parameter hints, and the doc comments in plain `.js` files, with no build
step and no TypeScript in your project.

## What's in the bundle

Everything the package exports — the data classes (`ActionData`, `ContextActionData`,
`VizPointClickData`, `LiveboardActionData`, `LiveboardData`, `SearchData`, `AnswerData`,
`SpotterData`, `VizData`, and the `TabularData` / `VizCollectionData` / `PayloadData` base classes),
the `createDataClass` factory with `DataClassType` and `detectDataClassType`, the `isTabularData` and
`isVizCollectionData` guards, and the `tabularDataToHTML`, `tabularDataToCSV`,
`tabularDataToCSVDataURI`, `escapeHTML`, and `sortObjects` helpers.

Full API documentation is in the [project README](../README.md) — the API is identical no matter which
build you load.
