# Data Classes

> ## ⚠️ 2.0 contains breaking changes
>
> If you are upgrading from 1.x, **read [Migrating from 1.x](#migrating-from-1x) before you bump the version.** Some of the breaks are caught by the compiler; several others change behavior silently and will not raise any error at all.
>
> The three most likely to bite you:
>
> 1. **`tabularDataToCSV()` no longer returns a `data:` URI.** It returns CSV text. If you were assigning it to a link's `href`, that link is now broken — and nothing will tell you. Switch to `tabularDataToCSVDataURI()`.
> 2. **No factory throws any more.** A `try`/`catch` around `SearchData.createFromJSON` will never fire; a malformed payload now comes back with `isValid === false`. Code that relied on the throw will carry on with an empty result.
> 3. **`TabularData.createFromJSON()` is gone**, replaced by the standalone `createDataClass()`.
>
> Plain JavaScript consumers should read the migration notes especially carefully: several breaks that TypeScript catches at compile time surface in JavaScript only as `undefined` at runtime.

## Overview

The data classes in `src/tse-data-classes.ts` wrap the ThoughtSpot payloads so you can treat every payload as tabular data with column metadata, normalized rows, and helper methods to inspect the data.

There are two shapes of result:

- **`TabularData`** — a single table. It keeps the original payload, lets you set and look up column names (with case-insensitive matching), exposes row/column counts, and provides `getDataAsTable()`, `getDataAsObjects()`, `populateDataByRow()`, and `populateDataByColumn()` so downstream UI code can treat every payload the same way.
- **`VizCollectionData`** — a collection of visualizations, each of which is a `TabularData`. Liveboard payloads use this, because a liveboard has no single table of its own.

Both derive from **`PayloadData`**, which retains the original payload and records anything that went wrong while normalizing it.

## Tested Versions

These classes have been tested against ThoughtSpot 10.15.

## Installation

```bash
npm install tse-data-classes
```

The package ships both ESM and CommonJS builds with TypeScript declarations, so `import` and `require` both work:

```javascript
import { TabularData, ActionData } from "tse-data-classes";
// or
const { TabularData, ActionData } = require("tse-data-classes");
```

### Without npm or TypeScript

If you are not using npm — a static page, a `<script>` tag, an embed dropped into an existing app —
[`downloads/`](downloads/) holds prebuilt single-file versions with no dependencies and nothing to
install:

```html
<script src="tse-data-classes.js"></script>
<script>
  const data = TSEDataClasses.createDataClass(payload);
</script>
```

There is a UMD build (script tag, `require()`, or AMD), an ES module build, and a `.d.ts` you can
drop beside them for editor completion in plain JavaScript. See
[`downloads/README.md`](downloads/README.md) for the details and the CDN URLs. The API is identical
to the npm package, so everything below applies unchanged.

## Development

```bash
npm install
npm run verify   # typecheck, tests with coverage, then build
```

Individual scripts:

| Script | What it does |
| --- | --- |
| `npm run build` | Emits the CommonJS and ESM builds plus `.d.ts` declarations into `dist/`, then refreshes `downloads/` |
| `npm run build:downloads` | Rebuilds only the single-file bundles in `downloads/` from the current `dist/esm` output |
| `npm run typecheck` | Typechecks `src` and `tests` without emitting |
| `npm test` | Runs the test suite |
| `npm run test:watch` | Runs the tests in watch mode |
| `npm run test:coverage` | Runs the tests and enforces the coverage thresholds |
| `npm run verify` | Typecheck, coverage, and build — what `prepublishOnly` runs |

## Reading a Result

Every factory returns an object that reports what happened during parsing, so an empty result can be told apart from a failed one. **A malformed payload does not throw** — it comes back with the problem recorded:

> **⚠️ Breaking change from 1.x.** In 1.x, `SearchData.createFromJSON` threw on a malformed payload while every other factory logged the problem and returned a half-populated object. Now none of them throw. Any `try`/`catch` you had around a factory call is dead code, and the failure it used to handle now passes through as a valid-looking but empty result. Replace the `catch` with an `isValid` check.

```javascript
const data = ActionData.createFromJSON(payload);

if (!data.isValid) {
  console.error("Could not read the payload:", data.errors);
  return;
}

if (data.warnings.length) {
  // Non-fatal adjustments, e.g. a duplicate column renamed or a short row padded.
  console.warn(data.warnings);
}

const rows = data.getDataAsObjects();
```

- `isValid` — false when the data is incomplete or missing.
- `errors` — why the data is incomplete or missing.
- `warnings` — adjustments made to keep the data usable.
- `originalData` — the untouched payload, for anything the classes do not model.

Errors are also logged to the console. Only the payload's top-level key names are logged, never its values, so customer data is never written to the log.

## Using the Factory Methods

### Generic Factory (Recommended)

If you don't know which payload type you're receiving, use `createDataClass`. It detects the payload structure and returns the appropriate data class instance:

> **⚠️ Breaking change from 1.x.** This replaces `TabularData.createFromJSON(payload, typeHint)`, which no longer exists. The static shared its name with every subclass's own `createFromJSON`, which made `ActionData.createFromJSON(payload, someHint)` typecheck while silently ignoring the hint. A standalone function removes the collision.

```javascript
import { createDataClass, isTabularData } from "tse-data-classes";

const data = createDataClass(payload);

if (isTabularData(data)) {
  const rows = data.getDataAsObjects();
} else {
  // A liveboard payload: a collection of visualizations.
  for (const vizId of data.vizIds) {
    console.log(vizId, data.getViz(vizId).getDataAsObjects());
  }
}
```

`createDataClass` throws only when the payload matches no known shape. A recognized payload that fails to parse comes back with `isValid === false` instead.

Passing a type hint skips detection **and narrows the return type**, so you don't need a cast:

```javascript
import { createDataClass, DataClassType } from "tse-data-classes";

const spotterData = createDataClass(payload, DataClassType.SpotterData); // typed SpotterData
```

The `DataClassType` enum includes: `ActionData`, `ContextActionData`, `VizPointClickData`, `LiveboardActionData`, `LiveboardData`, `SearchData`, `AnswerData`, and `SpotterData`.

Use `detectDataClassType(payload)` if you want the detected type without parsing. It returns `null` for an unrecognized payload.

> **Spotter payloads.** A Spotter response is structurally identical to an action payload, so detection cannot tell them apart and resolves that shape to `ActionData`, which parses a superset of it. Pass `DataClassType.SpotterData` explicitly when you specifically need a `SpotterData` instance.

### Type-Specific Factories

Alternatively, call the factory that corresponds to the payload you receive. The factories read the embedded column metadata, reorder the values to match the column names, and populate the base class so you can immediately use the API below.

```javascript
const actionData = ActionData.createFromJSON(payload);
const rows = actionData.getDataAsTable();
```

The classes and their typical sources are:

- `ActionData.createFromJSON(payload)` — menu actions on answers (including visualizations in liveboards) or `EventType.Data`. Use this for primary actions that return embedded answer data. Reads the payload whether `embedAnswerData` sits at the root or under `data`.
- `ContextActionData.createFromJSON(payload)` — context menu actions or clicks on selected points. Each selected attribute/measure becomes a column. When nothing is selected, it falls back to the point under the cursor.
- `VizPointClickData.createFromJSON(payload)` — visualization point click events. Stores the click metadata (`vizId`, `clickType`, `status`), the `embedAnswerData` payload, and the tabular columns describing the clicked/selected points.
- `LiveboardActionData.createFromJSON(payload)` — liveboard menu actions. Creates an empty `VizData` for every visualization container in the pinboard details; this payload carries no data for them.
- `LiveboardData.createFromJSON(payload)` — response from the liveboard data API. Each visualization becomes a `VizData` entry with its own columns and rows.
- `SearchData.createFromJSON(payload)` — search results (Search Data API and `fetchAnswerData` calls). Columns and rows come from `contents[0]`.
- `AnswerData.createFromJSON(payload)` — `payload.answerService.fetchData(...)` calls. Functionally the same as `SearchData` but emitted in the answer API shape.
- `SpotterData.createFromJSON(payload)` — Spotter API responses.

### TabularData Public API

- `columnNames` — the normalized column names, in payload order. Returns a copy.
- `nbrColumns` — how many columns were detected.
- `nbrRows` — how many rows are stored. Always matches the actual data.
- `getOriginalColumnName(columnName)` — case-insensitive lookup returning the stored casing, or `undefined`.
- `hasColumn(columnName)` — case-insensitive presence check.
- `getDataAsTable(columnNames?)` — the data as an array of positional rows.
- `getDataAsObjects(columnNames?)` — the data as an array of objects keyed by column name.
- `data` — the raw column store, keyed by column name. Treat it as read-only.

Both `getDataAsTable` and `getDataAsObjects` accept a single column name, an array of names, or nothing at all (meaning every column). Names are matched case-insensitively, and the columns come back in the order you asked for:

```javascript
const actionData = ActionData.createFromJSON(payload);

console.log("Columns:", actionData.columnNames);
console.log("Row count:", actionData.nbrRows);

if (actionData.hasColumn("Status")) {
  // getDataAsObjects gives you rows keyed by name.
  const [firstRow] = actionData.getDataAsObjects();
  console.log("First status value:", firstRow["Status"]);

  // getDataAsTable gives you positional rows, in the order requested.
  const [statuses] = actionData.getDataAsTable("Status");
  console.log("First status value:", statuses[0]);
}
```

The result of `getDataAsTable` is always rectangular with exactly `nbrRows` rows. A column name that does not exist yields a column of `null`s and a recorded warning, so a typo can never silently drop or shift the surrounding data.

#### Column name collisions

Column names are compared case-insensitively throughout. A name that collides with one already present is given a numeric suffix, and the rename is recorded in `warnings`:

```javascript
// A payload with columns ["Amount", "amount"] normalizes to:
data.columnNames; // ["Amount", "amount (2)"]
```

Without this, two columns sharing a display name would share one entry and their values would run together.

### VizCollectionData Public API

`LiveboardData` and `LiveboardActionData` hold a collection of visualizations rather than a single table, so they do **not** have `getDataAsTable()` or `nbrRows`. Read the individual visualizations instead:

> **⚠️ Breaking change from 1.x.** These two classes used to extend `TabularData`, which meant they inherited a table API that could only ever report empty: `nbrRows` was always `0`, `getDataAsTable()` always returned `[]`, and `tabularDataToHTML()` on a liveboard silently produced an empty table. They now extend `VizCollectionData` and those members are gone, so such a call is an error instead of a wrong answer. `instanceof TabularData` on a liveboard result is now `false` — use `isVizCollectionData()` or `isTabularData()` to branch.

- `vizIds` — the visualization IDs in the collection.
- `nbrVisualizations` — how many visualizations there are.
- `getViz(vizId)` — one visualization as a `VizData` (a `TabularData`), or `undefined`.
- `vizData` — the whole map, keyed by visualization ID.

```javascript
const liveboard = LiveboardData.createFromJSON(payload);

for (const vizId of liveboard.vizIds) {
  const viz = liveboard.getViz(vizId);
  console.log(viz.vizName, viz.nbrRows, viz.getDataAsObjects());
}
```

## Helper Methods

- `sortObjects(array, attr, direction?)` — sorts an array of objects in place by the `attr` key and returns the same array. `direction` is `"asc"` (default) or `"desc"`. Numbers compare numerically, strings with `localeCompare`, and `null`/`undefined`/`NaN` always sort last in both directions so they never scatter through the results.
- `tabularDataToHTML(tabularData)` — renders any `TabularData` as an HTML table using the CSS classes `tabular-data` and `tabular-data-th`. **All column names and values are HTML-escaped**, because worksheet column names and cell values are user-authored and must not reach the DOM as markup.
- `tabularDataToCSV(tabularData)` — produces CSV text (CRLF line endings, per RFC 4180) with every field quoted and escaped.
- `tabularDataToCSVDataURI(tabularData)` — produces a percent-encoded `data:text/csv` URI for a download link.
- `escapeHTML(value)` — the escaping used by `tabularDataToHTML`, exported for building your own markup.
- `isTabularData(data)` / `isVizCollectionData(data)` — type guards for narrowing a `createDataClass` result.

```javascript
const actionData = ActionData.createFromJSON(payload);

const csv = tabularDataToCSV(actionData); // write this to a file
const href = tabularDataToCSVDataURI(actionData); // or use this as a download link
```

> **⚠️ Breaking change from 1.x, and the easiest one to miss.** `tabularDataToCSV()` used to return a string with a `data:text/csv;charset=utf-8,` prefix glued to the front. It now returns the CSV itself.
>
> Nothing will warn you about this. Both versions return a `string`, so the compiler is happy and an `href` assignment still "works" — the link just no longer downloads anything useful. Search your code for every `tabularDataToCSV` call and decide which one you actually wanted:
>
> ```javascript
> // 1.x — a data URI, and a broken one: the body was never percent-encoded,
> // so any #, %, or & in the data truncated or corrupted it.
> link.href = tabularDataToCSV(data);
>
> // 2.x — for a download link (properly encoded):
> link.href = tabularDataToCSVDataURI(data);
>
> // 2.x — for a file, a clipboard, or a POST body:
> fs.writeFileSync("export.csv", tabularDataToCSV(data));
> ```
>
> Two further changes to the CSV text itself, both of which can break a snapshot test or a strict downstream parser: rows now end with `\r\n` rather than `\n`, per RFC 4180, and formula-like values are prefixed with a quote (see below).

### CSV safety

`tabularDataToCSV` prefixes any string value that starts with `=`, `+`, `-`, `@`, a tab, or a carriage return with a single quote, which forces Excel and Google Sheets to treat it as text. Without that, an exported cell such as `=HYPERLINK(...)` or `@SUM(A1)` executes when someone opens the file. Values that are simply numbers, including negative ones, are left untouched so numeric data stays clean.

> **⚠️ Behavior change from 1.x.** 1.x escaped embedded quotes but passed formula-like values through verbatim. If your data legitimately contains strings starting with one of those characters and something downstream re-parses the CSV, it will now see a leading `'` that was not there before.

### HTML safety

`tabularDataToHTML` escapes `&`, `<`, `>`, `"`, and `'` in every column name and every cell value.

> **⚠️ Security fix in 2.0 — treat 1.x output as untrusted.** 1.x interpolated column names and values straight into the markup, so a worksheet column named `<img src=x onerror=...>` or a cell containing a `<script>` tag executed in whatever page rendered the table. If you shipped 1.x output into a page, that was a live XSS vector. If you were working around it with your own escaping pass over the returned HTML, remove it — escaping the output a second time will now render the entities visibly as text.

## Migrating from 1.x

2.0 is a breaking release. The changes fall into two groups, and the second group is the one that needs your attention: those breaks produce no error of any kind, so the only way to find them is to look.

### Suggested upgrade path

1. Bump the version and run your typechecker. That clears the whole first table below.
2. Grep for `tabularDataToCSV`, `createFromJSON`, `viz_id`, `viz_name`, and `sortObjects`. These are where the silent breaks concentrate.
3. Re-record any snapshot test that covers CSV or HTML output — the output of both has changed.
4. Add an `isValid` check wherever you previously relied on a factory throwing.

### Breaks that fail loudly

TypeScript catches all of these at compile time. **In plain JavaScript, the first three surface only as `undefined` or a `TypeError` at runtime**, so check them by hand if you are not using TypeScript.

| 1.x | 2.x | What to do |
| --- | --- | --- |
| `TabularData.createFromJSON(payload, hint?)` | Removed | Call the standalone `createDataClass(payload, hint?)` |
| `VizData.viz_id` / `viz_name` | `VizData.vizId` / `vizName` | Rename. In JavaScript the old names now read `undefined` |
| `LiveboardData` / `LiveboardActionData` had `getDataAsTable()`, `nbrRows`, `nbrColumns`, `columnNames` | Removed; they extend `VizCollectionData` | Use `vizIds` and `getViz(id)`, then read the table off the returned `VizData` |
| `_cns`, `_nbrRows`, `_columnNameMap` were public | `protected` | Use `columnNames`, `nbrRows`, and `getOriginalColumnName()`. Still reachable from JavaScript, but unsupported |
| Cell values were `string \| number` | `CellValue` is `string \| number \| null` | Handle `null`, which marks a padded or missing cell |
| `data_rows` was typed `[string, number][]` | `PayloadCellValue[][]` | Nothing to do — the old type was wrong and rejected valid payloads |
| `require("tse-data-classes/dist/index.js")` | Fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` | Output moved to `dist/cjs/` and `dist/esm/`, and the `exports` map now allows only the package root. Import from `"tse-data-classes"` |

### Breaks that change behavior silently

**No error, no warning, no type failure.** Each of these compiles and runs, and simply does something different than it used to.

| 1.x behavior | 2.x behavior | Why it matters |
| --- | --- | --- |
| `tabularDataToCSV()` returned a `data:` URI | Returns CSV text | An `href` assignment still typechecks and still "works", but the link no longer downloads correctly. Use `tabularDataToCSVDataURI()` |
| `SearchData.createFromJSON` threw on a bad payload | Nothing throws | Your `catch` block is now unreachable and the bad payload passes through as an empty result. Check `isValid` |
| The other factories logged and returned a half-populated object | Same, but the problem is recorded | You can now tell an empty answer from a failed parse. Read `errors` and `warnings` |
| CSV rows ended with `\n` | `\r\n`, per RFC 4180 | Breaks exact-match snapshot tests and strict line-based parsers |
| CSV passed formula-like values through verbatim | Values starting `=`, `+`, `-`, `@`, tab, or CR get a `'` prefix | Security fix. Changes the exported text for affected values |
| HTML output was not escaped | All names and values are escaped | Security fix — 1.x output was an XSS vector. Remove any escaping pass you added yourself, or entities will render as visible text |
| A missing column in `getDataAsTable()` returned `[]` (if it was first) or `undefined` cells | Returns a full column of `null`s and records a warning | Code that relied on the empty result, or on a truthiness check, now sees rows |
| Duplicate column names collapsed into one entry | The later one is renamed, e.g. `Amount` and `amount (2)` | A `data["amount"]` lookup for the second column now misses. Read `columnNames` to see the applied names |
| `nbrRows` could exceed the stored data after a ragged or failed parse | Always matches the data | A loop bounded by `nbrRows` no longer runs past the end — but the number itself may differ from 1.x |
| `sortObjects()` compared with `<` / `>` and returned `void` | Type-aware comparison; returns the array; takes a direction | Numbers and booleans order the same as before. **Strings, mixed types, and `null`/`undefined`/`NaN` all order differently** — see the table below |
| Auto-detection returned `SpotterData` for a `data.embedAnswerData` payload | Returns `ActionData` | `instanceof SpotterData` on an auto-detected result is now `false`. Pass `DataClassType.SpotterData` explicitly if you need that class |
| `contents: []` threw "Unable to determine payload type" | Detected as `LiveboardData` or `SearchData` | An empty liveboard or result set is now parsed instead of throwing |

#### `sortObjects` ordering, measured

1.x compared values with the bare `<` and `>` operators. That is correct for numbers, but it sorts strings by UTF-16 code unit (so every capital letter precedes every lowercase one), coerces mixed types, and cannot order `null`, `undefined`, or `NaN` consistently — `NaN` compares false against everything, which makes the comparator inconsistent and can scramble the array. Actual output for the same input:

| Input | 1.x | 2.x | |
| --- | --- | --- | --- |
| `10, 9, 2` | `2, 9, 10` | `2, 9, 10` | unchanged |
| `true, false, true` | `false, true, true` | `false, true, true` | unchanged |
| `"10", "9", "2"` | `"10", "2", "9"` | `"10", "2", "9"` | unchanged |
| `"b", "A", "a", "Z"` | `"A", "Z", "a", "b"` | `"a", "A", "b", "Z"` | **changed** |
| `5, null, 1, undefined` | `null, 1, 5, undefined` | `1, 5, null, undefined` | **changed** |
| `NaN, 3, 1` | `NaN, 1, 3` | `1, 3, NaN` | **changed** |
| `2, "10"` | `2, "10"` | `"10", 2` | **changed** |

If you were sorting user-visible strings, the new locale ordering is almost certainly what you wanted. If you depended on the old code-unit ordering, sort on a pre-lowercased key instead.

### Not breaking

These are additions, safe to ignore until you want them: `getDataAsObjects()`, `detectDataClassType()`, `isTabularData()`, `isVizCollectionData()`, `escapeHTML()`, `tabularDataToCSVDataURI()`, the `isValid` / `errors` / `warnings` accessors, the `PayloadData` and `VizCollectionData` base classes, per-hint return-type narrowing on `createDataClass`, and the ESM build.
