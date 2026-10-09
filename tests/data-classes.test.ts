import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ActionData,
  AnswerData,
  ContextActionData,
  LiveboardActionData,
  LiveboardData,
  SearchData,
  SpotterData,
  TabularData,
  VizPointClickData,
  VizCollectionData,
} from "../src/tse-data-classes";
import {
  actionDataPayload,
  answerDataPayload,
  clickedOnlyContextActionPayload,
  contextActionPayload,
  emptySearchDataPayload,
  liveboardActionPayload,
  liveboardDataPayload,
  nestedActionDataPayload,
  nestedLiveboardActionPayload,
  searchDataPayload,
  singleClickedPointPayload,
  singleDataSetActionPayload,
  spotterDataPayload,
  vizPointClickPayload,
} from "./fixtures";

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("SearchData", () => {
  it("normalizes the first contents block", () => {
    const data = SearchData.createFromJSON(searchDataPayload);

    expect(data.isValid).toBe(true);
    expect(data.columnNames).toEqual(["Region", "Revenue"]);
    expect(data.nbrRows).toBe(3);
    expect(data.getDataAsTable()).toEqual([
      ["East", 100],
      ["West", 250],
      ["North", 75],
    ]);
  });

  it("retains the original payload", () => {
    expect(SearchData.createFromJSON(searchDataPayload).originalData).toBe(
      searchDataPayload as unknown as Record<string, unknown>,
    );
  });

  it("treats an answer with no rows as valid, not as a failure", () => {
    const data = SearchData.createFromJSON(emptySearchDataPayload);

    expect(data.isValid).toBe(true);
    expect(data.errors).toEqual([]);
    expect(data.columnNames).toEqual(["Region", "Revenue"]);
    expect(data.nbrRows).toBe(0);
    expect(data.getDataAsTable()).toEqual([]);
  });

  it("records an error rather than throwing when contents is missing", () => {
    const data = SearchData.createFromJSON({} as never);

    expect(data.isValid).toBe(false);
    expect(data.errors).toHaveLength(1);
    expect(data.nbrRows).toBe(0);
  });

  it("records an error when contents is an empty array", () => {
    const data = SearchData.createFromJSON({ contents: [] });

    expect(data.isValid).toBe(false);
    expect(data.errors[0]).toContain("empty");
  });
});

describe("AnswerData", () => {
  it("normalizes the same shape as SearchData", () => {
    const data = AnswerData.createFromJSON(answerDataPayload);

    expect(data.isValid).toBe(true);
    expect(data.columnNames).toEqual(["Region", "Revenue"]);
    expect(data.nbrRows).toBe(3);
  });

  it("records an error for a malformed payload", () => {
    expect(AnswerData.createFromJSON({} as never).isValid).toBe(false);
  });
});

describe("ActionData", () => {
  it("aligns values to columns by column ID", () => {
    const data = ActionData.createFromJSON(actionDataPayload);

    expect(data.isValid).toBe(true);
    expect(data.columnNames).toEqual(["Region", "Revenue"]);
    expect(data.getDataAsTable()).toEqual([
      ["East", 100],
      ["West", 250],
    ]);
  });

  it("reads embedAnswerData nested under data", () => {
    const data = ActionData.createFromJSON(nestedActionDataPayload);

    expect(data.isValid).toBe(true);
    expect(data.nbrRows).toBe(2);
  });

  it("accepts data as a single data set rather than an array", () => {
    const data = ActionData.createFromJSON(singleDataSetActionPayload);

    expect(data.isValid).toBe(true);
    expect(data.getDataAsTable()).toEqual([
      ["East", 100],
      ["West", 250],
    ]);
  });

  it("records an error when embedAnswerData is absent", () => {
    const data = ActionData.createFromJSON({});

    expect(data.isValid).toBe(false);
    expect(data.errors[0]).toContain("embedAnswerData");
  });

  it("records an error when columnDataLite is absent", () => {
    const data = ActionData.createFromJSON({
      embedAnswerData: { columns: [], data: {} as never },
    });

    expect(data.isValid).toBe(false);
    expect(data.errors[0]).toContain("columnDataLite");
  });

  it("drops a column whose ID has no metadata and says so", () => {
    const data = ActionData.createFromJSON({
      embedAnswerData: {
        columns: [{ column: { dataType: "CHAR", id: "known", name: "Known" } }],
        data: {
          columnDataLite: [
            { columnId: "known", dataValue: ["a"] },
            { columnId: "orphan", dataValue: ["b"] },
          ],
        },
      },
    });

    expect(data.columnNames).toEqual(["Known"]);
    expect(data.getDataAsTable()).toEqual([["a"]]);
    expect(data.isValid).toBe(false);
    expect(data.errors[0]).toContain("orphan");
  });

  it("logs only the payload shape, never the payload contents", () => {
    ActionData.createFromJSON({} as never);

    const logged = errorSpy.mock.calls.flat().join(" ");
    expect(logged).toContain("payload shape:");
    expect(logged).not.toContain("East");
  });
});

describe("SpotterData", () => {
  it("normalizes a Spotter payload", () => {
    const data = SpotterData.createFromJSON(spotterDataPayload);

    expect(data.isValid).toBe(true);
    expect(data.columnNames).toEqual(["Product", "Sales"]);
    expect(data.getDataAsTable()).toEqual([
      ["Widget", 10.5],
      ["Gadget", 20.25],
    ]);
  });

  it("records an error for a malformed payload", () => {
    expect(SpotterData.createFromJSON({}).isValid).toBe(false);
  });
});

describe("ContextActionData", () => {
  it("turns each selected attribute and measure into a column", () => {
    const data = ContextActionData.createFromJSON(contextActionPayload);

    expect(data.isValid).toBe(true);
    expect(data.columnNames).toEqual(["Region", "Revenue"]);
    expect(data.getDataAsTable()).toEqual([["East", 100]]);
  });

  it("falls back to the clicked point when nothing is selected", () => {
    const data = ContextActionData.createFromJSON(
      clickedOnlyContextActionPayload,
    );

    expect(data.isValid).toBe(true);
    expect(data.getDataAsTable()).toEqual([["West"]]);
  });

  it("does not add the same column twice across points", () => {
    const data = ContextActionData.createFromJSON({
      contextMenuPoints: {
        selectedPoints: [
          {
            selectedAttributes: [
              { column: { dataType: "CHAR", name: "Region" }, value: "East" },
            ],
          },
          {
            selectedAttributes: [
              { column: { dataType: "CHAR", name: "region" }, value: "West" },
            ],
          },
        ],
      },
    });

    expect(data.columnNames).toEqual(["Region"]);
  });

  it("records an error when contextMenuPoints is absent", () => {
    const data = ContextActionData.createFromJSON({});

    expect(data.isValid).toBe(false);
    expect(data.errors[0]).toContain("contextMenuPoints");
  });

  it("records an error when there are points but no selections in them", () => {
    const data = ContextActionData.createFromJSON({
      contextMenuPoints: { selectedPoints: [{}] },
    });

    expect(data.isValid).toBe(false);
  });
});

describe("VizPointClickData", () => {
  it("captures the click metadata alongside the columns", () => {
    const data = VizPointClickData.createFromJSON(vizPointClickPayload);

    expect(data.isValid).toBe(true);
    expect(data.clickType).toBe("VizPointClick");
    expect(data.vizId).toBe("viz-1");
    expect(data.status).toBe("COMPLETE");
    expect(data.getDataAsTable()).toEqual([["East", 100]]);
  });

  it("accepts a single clickedPoint as well as an array", () => {
    const data = VizPointClickData.createFromJSON(singleClickedPointPayload);

    expect(data.isValid).toBe(true);
    expect(data.getDataAsTable()).toEqual([["North"]]);
  });

  it("falls back to selectedPoints when no point was clicked", () => {
    const data = VizPointClickData.createFromJSON({
      type: "VizPointClick",
      data: {
        selectedPoints: [
          {
            selectedAttributes: [
              { column: { dataType: "CHAR", name: "Region" }, value: "South" },
            ],
          },
        ],
      },
    });

    expect(data.getDataAsTable()).toEqual([["South"]]);
  });

  it("records an error when there is no data payload", () => {
    const data = VizPointClickData.createFromJSON({ type: "VizPointClick" });

    expect(data.isValid).toBe(false);
  });
});

describe("LiveboardData", () => {
  it("builds one populated VizData per visualization", () => {
    const data = LiveboardData.createFromJSON(liveboardDataPayload);

    expect(data.isValid).toBe(true);
    expect(data.vizIds).toEqual(["viz-1", "viz-2"]);
    expect(data.nbrVisualizations).toBe(2);

    const viz = data.getViz("viz-1");
    expect(viz?.vizId).toBe("viz-1");
    expect(viz?.vizName).toBe("Revenue by Region");
    expect(viz?.columnNames).toEqual(["Region", "Revenue"]);
    expect(viz?.getDataAsTable()).toEqual([
      ["East", 100],
      ["West", 250],
    ]);
  });

  it("returns undefined for an unknown visualization ID", () => {
    expect(
      LiveboardData.createFromJSON(liveboardDataPayload).getViz("nope"),
    ).toBeUndefined();
  });

  it("is a visualization collection, not a table", () => {
    const data = LiveboardData.createFromJSON(liveboardDataPayload);

    // The old class inherited TabularData and reported a permanently empty table.
    expect(data).toBeInstanceOf(VizCollectionData);
    expect(data).not.toBeInstanceOf(TabularData);
    expect(data).not.toHaveProperty("getDataAsTable");
  });

  it("records an error when contents is missing", () => {
    expect(LiveboardData.createFromJSON({} as never).isValid).toBe(false);
  });

  it("treats a liveboard with no visualizations as valid", () => {
    const data = LiveboardData.createFromJSON({ contents: [] });

    expect(data.isValid).toBe(true);
    expect(data.nbrVisualizations).toBe(0);
  });
});

describe("LiveboardActionData", () => {
  it("builds an empty VizData per container", () => {
    const data = LiveboardActionData.createFromJSON(liveboardActionPayload);

    expect(data.isValid).toBe(true);
    expect(data.vizIds).toEqual(["viz-1", "viz-2"]);
    expect(data.getViz("viz-1")?.nbrRows).toBe(0);
    expect(data.getViz("viz-1")?.columnNames).toEqual([]);
  });

  it("reads pinboardDetails nested under data", () => {
    const data = LiveboardActionData.createFromJSON(
      nestedLiveboardActionPayload,
    );

    expect(data.vizIds).toEqual(["viz-9"]);
  });

  it("records an error when there are no containers", () => {
    const data = LiveboardActionData.createFromJSON({});

    expect(data.isValid).toBe(false);
    expect(data.errors[0]).toContain("containers");
  });
});
