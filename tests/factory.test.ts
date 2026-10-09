import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ActionData,
  AnswerData,
  ContextActionData,
  createDataClass,
  DataClassType,
  detectDataClassType,
  isTabularData,
  isVizCollectionData,
  LiveboardActionData,
  LiveboardData,
  SearchData,
  SpotterData,
  TabularData,
  VizCollectionData,
  VizPointClickData,
} from "../src/tse-data-classes";
import {
  actionDataPayload,
  answerDataPayload,
  contextActionPayload,
  emptySearchDataPayload,
  liveboardActionPayload,
  liveboardDataPayload,
  nestedActionDataPayload,
  nestedLiveboardActionPayload,
  searchDataPayload,
  spotterDataPayload,
  vizPointClickPayload,
} from "./fixtures";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("detectDataClassType", () => {
  const cases: [string, unknown, DataClassType][] = [
    ["a search response", searchDataPayload, DataClassType.SearchData],
    ["an empty search response", emptySearchDataPayload, DataClassType.SearchData],
    ["an answer response", answerDataPayload, DataClassType.AnswerData],
    ["a liveboard response", liveboardDataPayload, DataClassType.LiveboardData],
    [
      "a liveboard action",
      liveboardActionPayload,
      DataClassType.LiveboardActionData,
    ],
    [
      "a nested liveboard action",
      nestedLiveboardActionPayload,
      DataClassType.LiveboardActionData,
    ],
    [
      "a context action",
      contextActionPayload,
      DataClassType.ContextActionData,
    ],
    [
      "a point click",
      vizPointClickPayload,
      DataClassType.VizPointClickData,
    ],
    ["an action", actionDataPayload, DataClassType.ActionData],
    ["a nested action", nestedActionDataPayload, DataClassType.ActionData],
  ];

  it.each(cases)("detects %s", (_label, payload, expected) => {
    expect(detectDataClassType(payload)).toBe(expected);
  });

  it("detects a liveboard with no visualizations", () => {
    // The old detection required a non-empty contents array and gave up here.
    expect(detectDataClassType({ metadata_id: "lb", contents: [] })).toBe(
      DataClassType.LiveboardData,
    );
  });

  it("detects a search response with no contents blocks", () => {
    expect(detectDataClassType({ contents: [] })).toBe(
      DataClassType.SearchData,
    );
  });

  it("resolves the Spotter payload shape to ActionData, which parses a superset", () => {
    expect(detectDataClassType(spotterDataPayload)).toBe(
      DataClassType.ActionData,
    );
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "not a payload"],
    ["a number", 42],
    ["an array", [1, 2, 3]],
    ["an unrelated object", { unrelated: true }],
  ])("returns null for %s", (_label, payload) => {
    expect(detectDataClassType(payload)).toBeNull();
  });

  it("does not trip over a non-object data property", () => {
    expect(detectDataClassType({ type: "x", data: "a string" })).toBeNull();
  });
});

describe("createDataClass", () => {
  it.each([
    [searchDataPayload, SearchData],
    [answerDataPayload, AnswerData],
    [liveboardDataPayload, LiveboardData],
    [liveboardActionPayload, LiveboardActionData],
    [contextActionPayload, ContextActionData],
    [vizPointClickPayload, VizPointClickData],
    [actionDataPayload, ActionData],
    [nestedActionDataPayload, ActionData],
  ])("builds the detected class from payload %#", (payload, expected) => {
    expect(createDataClass(payload)).toBeInstanceOf(expected);
  });

  it("honours an explicit type hint over detection", () => {
    // The two payload shapes are identical, so only the hint can select SpotterData.
    expect(createDataClass(spotterDataPayload)).toBeInstanceOf(ActionData);
    expect(
      createDataClass(spotterDataPayload, DataClassType.SpotterData),
    ).toBeInstanceOf(SpotterData);
  });

  it("parses correctly through the hint path", () => {
    const data = createDataClass(
      spotterDataPayload,
      DataClassType.SpotterData,
    );

    expect(data.isValid).toBe(true);
    expect(data.columnNames).toEqual(["Product", "Sales"]);
  });

  it("throws only when the payload matches no known shape", () => {
    expect(() => createDataClass({ unrelated: true })).toThrow(
      /Unable to determine payload type/,
    );
  });

  it("names the payload shape in the error but not its contents", () => {
    let message = "";
    try {
      createDataClass({ secretColumn: "customer-value" });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("secretColumn");
    expect(message).not.toContain("customer-value");
  });

  it("does not throw for a recognized payload that fails to parse; it reports instead", () => {
    const data = createDataClass({ embedAnswerData: {} as never });

    expect(data.isValid).toBe(false);
    expect(data.errors.length).toBeGreaterThan(0);
  });

  it("throws for an unknown type hint value", () => {
    expect(() =>
      createDataClass(searchDataPayload, "NotAType" as DataClassType),
    ).toThrow(/Unknown data class type/);
  });
});

describe("type guards", () => {
  it("identifies a table", () => {
    const data = createDataClass(searchDataPayload);

    expect(isTabularData(data)).toBe(true);
    expect(isVizCollectionData(data)).toBe(false);
  });

  it("identifies a visualization collection", () => {
    for (const payload of [liveboardDataPayload, liveboardActionPayload]) {
      const data = createDataClass(payload);

      expect(isVizCollectionData(data)).toBe(true);
      expect(isTabularData(data)).toBe(false);
    }
  });

  it("narrows the union so the right API is reachable without a cast", () => {
    const data = createDataClass(searchDataPayload);

    // Without the guard this union member has no tabular API at all.
    if (isTabularData(data)) {
      expect(data.getDataAsTable()).toHaveLength(3);
    } else {
      throw new Error("expected a table");
    }
  });

  it("keeps the class hierarchy split", () => {
    expect(createDataClass(searchDataPayload)).toBeInstanceOf(TabularData);
    expect(createDataClass(liveboardDataPayload)).toBeInstanceOf(
      VizCollectionData,
    );
    expect(createDataClass(liveboardDataPayload)).not.toBeInstanceOf(
      TabularData,
    );
  });
});
