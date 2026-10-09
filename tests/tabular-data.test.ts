import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchData, TabularData } from "../src/tse-data-classes";
import { searchDataPayload } from "./fixtures";

/** Concrete handle on the base class for testing the normalization primitives directly. */
class TestData extends TabularData {}

beforeEach(() => {
  // The classes log errors; keep the test output readable while still asserting on the calls.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("column names", () => {
  it("stores the names in payload order and reports the counts", () => {
    const data = new TestData({});
    data.columnNames = ["Region", "Revenue"];

    expect(data.columnNames).toEqual(["Region", "Revenue"]);
    expect(data.nbrColumns).toBe(2);
    expect(data.nbrRows).toBe(0);
  });

  it("returns a copy so callers cannot mutate the internal list", () => {
    const data = new TestData({});
    data.columnNames = ["Region"];

    data.columnNames.push("Injected");

    expect(data.columnNames).toEqual(["Region"]);
  });

  it("looks up columns case-insensitively", () => {
    const data = new TestData({});
    data.columnNames = ["Region"];

    expect(data.hasColumn("REGION")).toBe(true);
    expect(data.hasColumn("region")).toBe(true);
    expect(data.getOriginalColumnName("rEgIoN")).toBe("Region");
    expect(data.hasColumn("Missing")).toBe(false);
    expect(data.getOriginalColumnName("Missing")).toBeUndefined();
  });

  it("renames an exact duplicate so its values stay separate", () => {
    const data = SearchData.createFromJSON({
      contents: [
        {
          column_names: ["Amount", "Amount"],
          data_rows: [
            [1, 2],
            [3, 4],
          ],
        },
      ],
    });

    expect(data.columnNames).toEqual(["Amount", "Amount (2)"]);
    expect(data.nbrRows).toBe(2);
    expect(data.getDataAsTable()).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(data.warnings).toContainEqual(
      'Duplicate column name "Amount" was renamed to "Amount (2)".',
    );
  });

  it("renames a duplicate that differs only by case, so both stay reachable", () => {
    const data = SearchData.createFromJSON({
      contents: [{ column_names: ["Name", "name"], data_rows: [["a", "b"]] }],
    });

    expect(data.columnNames).toEqual(["Name", "name (2)"]);
    expect(data.getDataAsTable()).toEqual([["a", "b"]]);
    expect(data.getOriginalColumnName("NAME")).toBe("Name");
  });

  it("keeps suffixing when the suffixed name is also taken", () => {
    const data = new TestData({});
    data.columnNames = ["A", "A", "A (2)", "A"];

    expect(data.columnNames).toEqual(["A", "A (2)", "A (2) (2)", "A (3)"]);
  });

  it("clears previously populated data when the names are set again", () => {
    const data = SearchData.createFromJSON(searchDataPayload);
    expect(Object.keys(data.data)).toEqual(["Region", "Revenue"]);

    data.columnNames = ["Only"];

    expect(Object.keys(data.data)).toEqual([]);
    expect(data.nbrRows).toBe(0);

    data.populateDataByColumn([[1, 2]]);
    expect(Object.keys(data.data)).toEqual(["Only"]);
    expect(data.nbrRows).toBe(2);
  });
});

describe("populateDataByRow", () => {
  it("normalizes rows into columns", () => {
    const data = new TestData({});
    data.columnNames = ["A", "B"];
    data.populateDataByRow([
      [1, 2],
      [3, 4],
    ]);

    expect(data.data).toEqual({ A: [1, 3], B: [2, 4] });
    expect(data.nbrRows).toBe(2);
  });

  it("handles no rows at all", () => {
    const data = new TestData({});
    data.columnNames = ["A"];
    data.populateDataByRow([]);

    expect(data.nbrRows).toBe(0);
    expect(data.data).toEqual({ A: [] });
    expect(data.getDataAsTable()).toEqual([]);
  });

  it("pads a short row with null and keeps the row count honest", () => {
    const data = new TestData({});
    data.columnNames = ["A", "B"];
    data.populateDataByRow([[1, 2], [3]]);

    expect(data.nbrRows).toBe(2);
    expect(data.getDataAsTable()).toEqual([
      [1, 2],
      [3, null],
    ]);
    expect(data.warnings).toHaveLength(1);
  });

  it("drops values past the last column rather than shifting them", () => {
    const data = new TestData({});
    data.columnNames = ["A"];
    data.populateDataByRow([[1, 99]]);

    expect(data.getDataAsTable()).toEqual([[1]]);
    expect(data.warnings).toHaveLength(1);
  });

  it("keeps every column the same length, so nbrRows always matches the data", () => {
    const data = new TestData({});
    data.columnNames = ["A", "B", "C"];
    data.populateDataByRow([[1], [1, 2], [1, 2, 3]]);

    for (const column of Object.values(data.data)) {
      expect(column).toHaveLength(data.nbrRows);
    }
  });
});

describe("populateDataByColumn", () => {
  it("normalizes columns", () => {
    const data = new TestData({});
    data.columnNames = ["A", "B"];
    data.populateDataByColumn([
      [1, 3],
      [2, 4],
    ]);

    expect(data.nbrRows).toBe(2);
    expect(data.getDataAsTable()).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("copies the incoming arrays rather than aliasing them", () => {
    const data = new TestData({});
    const source = [[1, 2]];
    data.columnNames = ["A"];
    data.populateDataByColumn(source);

    source[0].push(3);

    expect(data.data.A).toEqual([1, 2]);
  });

  it("pads a ragged column with null up to the longest column", () => {
    const data = new TestData({});
    data.columnNames = ["A", "B"];
    data.populateDataByColumn([[1, 2, 3], [9]]);

    expect(data.nbrRows).toBe(3);
    expect(data.getDataAsTable()).toEqual([
      [1, 9],
      [2, null],
      [3, null],
    ]);
    expect(data.warnings.length).toBeGreaterThan(0);
  });

  it("warns when the column count does not match the names", () => {
    const data = new TestData({});
    data.columnNames = ["A", "B"];
    data.populateDataByColumn([[1]]);

    expect(data.warnings.some((w) => w.includes("Column count mismatch"))).toBe(
      true,
    );
    expect(data.data.B).toEqual([null]);
  });
});

describe("getDataAsTable", () => {
  const build = () => SearchData.createFromJSON(searchDataPayload);

  it("returns every column when nothing is requested", () => {
    expect(build().getDataAsTable()).toEqual([
      ["East", 100],
      ["West", 250],
      ["North", 75],
    ]);
  });

  it("treats null, undefined and an empty array as 'all columns'", () => {
    const all = build().getDataAsTable();
    expect(build().getDataAsTable(null)).toEqual(all);
    expect(build().getDataAsTable(undefined)).toEqual(all);
    expect(build().getDataAsTable([])).toEqual(all);
  });

  it("accepts a single column name as a bare string", () => {
    expect(build().getDataAsTable("Region")).toEqual([
      ["East"],
      ["West"],
      ["North"],
    ]);
  });

  it("returns the requested columns in the requested order", () => {
    expect(build().getDataAsTable(["Revenue", "Region"])).toEqual([
      [100, "East"],
      [250, "West"],
      [75, "North"],
    ]);
  });

  it("matches requested names case-insensitively", () => {
    expect(build().getDataAsTable(["REVENUE"])).toEqual([[100], [250], [75]]);
  });

  it("returns nulls for a missing FIRST column instead of losing every row", () => {
    const data = build();

    // The regression: sizing the result from the first column dropped the whole table.
    expect(data.getDataAsTable(["Nope", "Revenue"])).toEqual([
      [null, 100],
      [null, 250],
      [null, 75],
    ]);
    expect(data.warnings.some((w) => w.includes("Nope"))).toBe(true);
  });

  it("returns nulls for a missing later column", () => {
    expect(build().getDataAsTable(["Region", "Nope"])).toEqual([
      ["East", null],
      ["West", null],
      ["North", null],
    ]);
  });

  it("returns a rectangular table of exactly nbrRows rows whatever is asked for", () => {
    const data = build();
    const table = data.getDataAsTable(["Nope", "Region", "Missing"]);

    expect(table).toHaveLength(data.nbrRows);
    for (const row of table) {
      expect(row).toHaveLength(3);
    }
  });

  it("records a repeated missing column only once", () => {
    const data = build();
    data.getDataAsTable(["Nope"]);
    data.getDataAsTable(["Nope"]);

    expect(data.warnings.filter((w) => w.includes("Nope"))).toHaveLength(1);
  });
});

describe("getDataAsObjects", () => {
  it("returns rows keyed by column name", () => {
    expect(SearchData.createFromJSON(searchDataPayload).getDataAsObjects()).toEqual(
      [
        { Region: "East", Revenue: 100 },
        { Region: "West", Revenue: 250 },
        { Region: "North", Revenue: 75 },
      ],
    );
  });

  it("keys the result with the stored casing even when asked for another casing", () => {
    const rows = SearchData.createFromJSON(
      searchDataPayload,
    ).getDataAsObjects(["revenue"]);

    expect(rows[0]).toEqual({ Revenue: 100 });
  });

  it("returns an empty array when there are no rows", () => {
    const data = new TestData({});
    data.columnNames = ["A"];
    expect(data.getDataAsObjects()).toEqual([]);
  });
});
