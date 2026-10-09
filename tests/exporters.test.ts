import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  escapeHTML,
  SearchData,
  sortObjects,
  tabularDataToCSV,
  tabularDataToCSVDataURI,
  tabularDataToHTML,
} from "../src/tse-data-classes";
import { emptySearchDataPayload, searchDataPayload } from "./fixtures";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const tableWith = (columnNames: string[], dataRows: (string | number)[][]) =>
  SearchData.createFromJSON({
    contents: [{ column_names: columnNames, data_rows: dataRows }],
  });

describe("escapeHTML", () => {
  it.each([
    ["<script>", "&lt;script&gt;"],
    ["a & b", "a &amp; b"],
    ['say "hi"', "say &quot;hi&quot;"],
    ["it's", "it&#39;s"],
    ["plain", "plain"],
  ])("escapes %s", (input, expected) => {
    expect(escapeHTML(input)).toBe(expected);
  });

  it("renders null and undefined as empty text", () => {
    expect(escapeHTML(null)).toBe("");
    expect(escapeHTML(undefined)).toBe("");
  });
});

describe("tabularDataToHTML", () => {
  it("renders a header row and one row per record", () => {
    const html = tabularDataToHTML(SearchData.createFromJSON(searchDataPayload));

    expect(html.startsWith('<table class="tabular-data">')).toBe(true);
    expect(html).toContain('<th class="tabular-data-th">Region</th>');
    expect(html).toContain('<td class="tabular-data">East</td>');
    expect(html.match(/<tr>/g)).toHaveLength(4); // header plus three rows.
  });

  it("escapes a script tag in a cell value", () => {
    const html = tabularDataToHTML(
      tableWith(["Note"], ["<script>alert('pwn')</script>"].map((v) => [v])),
    );

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes an event-handler payload in a column name", () => {
    const html = tabularDataToHTML(
      tableWith(['<img src=x onerror="alert(1)">'], [["v"]]),
    );

    expect(html).not.toContain("<img");
    expect(html).not.toContain('onerror="');
    expect(html).toContain("&lt;img");
  });

  it("renders a header-only table when there are no rows", () => {
    const html = tabularDataToHTML(
      SearchData.createFromJSON(emptySearchDataPayload),
    );

    expect(html.match(/<tr>/g)).toHaveLength(1);
    expect(html).toContain("Region");
  });

  it("does not throw when a column name no longer matches the data", () => {
    const data = SearchData.createFromJSON(searchDataPayload);
    data.columnNames = ["Renamed", "Revenue"];

    // The old implementation indexed into an empty table and threw a TypeError here.
    expect(() => tabularDataToHTML(data)).not.toThrow();
    expect(tabularDataToHTML(data)).toContain("Renamed");
  });
});

describe("tabularDataToCSV", () => {
  it("returns CSV text with no data URI prefix", () => {
    const csv = tabularDataToCSV(SearchData.createFromJSON(searchDataPayload));

    expect(csv.startsWith("data:")).toBe(false);
    expect(csv).toBe(
      '"Region","Revenue"\r\n"East","100"\r\n"West","250"\r\n"North","75"\r\n',
    );
  });

  it("doubles embedded quotes", () => {
    expect(tabularDataToCSV(tableWith(["A"], [['say "hi"']]))).toContain(
      '"say ""hi"""',
    );
  });

  it("keeps commas and newlines inside the quoted field", () => {
    const csv = tabularDataToCSV(tableWith(["A"], [["a,b\nc"]]));

    expect(csv).toContain('"a,b\nc"');
  });

  it.each([
    "=1+1",
    "@SUM(A1)",
    "-1+cmd|",
    "=cmd|' /c calc'!A0",
    "\tDDE",
  ])("prefixes the formula %j with a quote so it stays text", (value) => {
    const csv = tabularDataToCSV(tableWith(["A"], [[value]]));

    // Strip the CSV framing to compare the field itself.
    const field = csv.split("\r\n")[1].slice(1, -1);
    expect(field).toBe(`'${value}`);
  });

  it("neutralizes a formula whose arguments also need quote escaping", () => {
    const csv = tabularDataToCSV(
      tableWith(["A"], [['=HYPERLINK("http://example.test")']]),
    );

    // Guarded with a leading quote, and the inner quotes doubled for CSV.
    expect(csv).toContain(
      '"\'=HYPERLINK(""http://example.test"")"',
    );
  });

  it.each([-5, "-5.5", "+1", "-0.5e3"])(
    "leaves the numeric value %j alone so numeric data stays clean",
    (value) => {
      const field = tabularDataToCSV(tableWith(["A"], [[value]]))
        .split("\r\n")[1]
        .slice(1, -1);

      expect(field).toBe(String(value));
    },
  );

  it("renders a padded null cell as an empty field", () => {
    const padded = tableWith(["A", "B"], [[1]]);

    expect(tabularDataToCSV(padded)).toBe('"A","B"\r\n"1",""\r\n');
  });

  it("emits only a header row when there are no records", () => {
    expect(
      tabularDataToCSV(SearchData.createFromJSON(emptySearchDataPayload)),
    ).toBe('"Region","Revenue"\r\n');
  });
});

describe("tabularDataToCSVDataURI", () => {
  it("percent-encodes the body so the CSV survives the round trip", () => {
    const data = tableWith(["A"], [["x#y 50% a&b"]]);
    const uri = tabularDataToCSVDataURI(data);

    expect(uri.startsWith("data:text/csv;charset=utf-8,")).toBe(true);

    const encoded = uri.slice("data:text/csv;charset=utf-8,".length);
    expect(encoded).not.toContain("#");
    expect(decodeURIComponent(encoded)).toBe(tabularDataToCSV(data));
  });
});

describe("sortObjects", () => {
  it("sorts ascending by default and returns the same array", () => {
    const rows = [{ n: 3 }, { n: 1 }, { n: 2 }];

    expect(sortObjects(rows, "n")).toBe(rows);
    expect(rows).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it("sorts descending on request", () => {
    expect(sortObjects([{ n: 1 }, { n: 3 }, { n: 2 }], "n", "desc")).toEqual([
      { n: 3 },
      { n: 2 },
      { n: 1 },
    ]);
  });

  it("compares numbers numerically rather than as strings", () => {
    expect(sortObjects([{ n: 10 }, { n: 9 }], "n")).toEqual([
      { n: 9 },
      { n: 10 },
    ]);
  });

  it("compares strings with localeCompare", () => {
    expect(sortObjects([{ s: "b" }, { s: "A" }, { s: "a" }], "s")).toEqual([
      { s: "a" },
      { s: "A" },
      { s: "b" },
    ]);
  });

  it("compares booleans false before true", () => {
    expect(sortObjects([{ b: true }, { b: false }], "b")).toEqual([
      { b: false },
      { b: true },
    ]);
  });

  it("puts missing values last in both directions", () => {
    const rows = () => [{ n: 2 }, { n: undefined }, { n: 1 }, { n: null }];

    expect(sortObjects(rows(), "n").map((r) => r.n)).toEqual([
      1,
      2,
      undefined,
      null,
    ]);
    expect(sortObjects(rows(), "n", "desc").map((r) => r.n)).toEqual([
      2,
      1,
      undefined,
      null,
    ]);
  });

  it("puts NaN last rather than scrambling the array", () => {
    const sorted = sortObjects([{ n: NaN }, { n: 3 }, { n: 1 }], "n");

    expect(sorted[0].n).toBe(1);
    expect(sorted[1].n).toBe(3);
    expect(Number.isNaN(sorted[2].n)).toBe(true);
  });

  it("falls back to string comparison for mixed types", () => {
    expect(sortObjects([{ v: 2 }, { v: "10" }], "v").map((r) => r.v)).toEqual([
      "10",
      2,
    ]);
  });
});
