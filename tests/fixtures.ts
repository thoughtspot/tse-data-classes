/**
 * Synthetic payload fixtures shaped like the ThoughtSpot payloads the data classes parse.
 * All values are invented; nothing here comes from a real cluster or customer.
 */
import type {
  ActionDataType,
  AnswerDataType,
  ContextActionDataType,
  LiveboardActionDataType,
  LiveboardDataType,
  SearchDataType,
  SpotterDataType,
  VizPointClickDataType,
} from "../src/tse-data-classes-types";

export const searchDataPayload: SearchDataType = {
  contents: [
    {
      available_data_row_count: 3,
      column_names: ["Region", "Revenue"],
      data_rows: [
        ["East", 100],
        ["West", 250],
        ["North", 75],
      ],
      record_offset: 0,
      record_size: 3,
      returned_data_row_count: 3,
      sampling_ratio: 1,
    },
  ],
};

/** A well-formed answer that simply matched no rows. */
export const emptySearchDataPayload: SearchDataType = {
  contents: [
    {
      available_data_row_count: 0,
      column_names: ["Region", "Revenue"],
      data_rows: [],
      returned_data_row_count: 0,
    },
  ],
};

export const answerDataPayload: AnswerDataType = {
  metadata_id: "answer-guid-0001",
  metadata_name: "Revenue by Region",
  contents: searchDataPayload.contents,
};

export const liveboardDataPayload: LiveboardDataType = {
  metadata_id: "liveboard-guid-0001",
  metadata_name: "Sales Overview",
  contents: [
    {
      visualization_id: "viz-1",
      visualization_name: "Revenue by Region",
      column_names: ["Region", "Revenue"],
      data_rows: [
        ["East", 100],
        ["West", 250],
      ],
    },
    {
      visualization_id: "viz-2",
      visualization_name: "Units by Region",
      column_names: ["Region", "Units"],
      data_rows: [["East", 12]],
    },
  ],
};

export const liveboardActionPayload: LiveboardActionDataType = {
  pinboardDetails: {
    __typename: "Pinboard",
    containers: [{ answerId: "viz-1" }, { answerId: "viz-2" }],
  },
};

/** The same liveboard action, nested under `data` as some embed surfaces send it. */
export const nestedLiveboardActionPayload: LiveboardActionDataType = {
  data: {
    pinboardDetails: {
      __typename: "Pinboard",
      containers: [{ answerId: "viz-9" }],
    },
  },
};

const embedAnswerData = {
  columns: [
    {
      __typename: "AnswerColumn",
      column: {
        __typename: "LogicalColumn",
        dataType: "CHAR",
        id: "col-region",
        name: "Region",
        referencedColumns: [{ __typename: "Ref", displayName: "Region" }],
        type: "ATTRIBUTE",
      },
    },
    {
      __typename: "AnswerColumn",
      column: {
        __typename: "LogicalColumn",
        dataType: "INT64",
        id: "col-revenue",
        name: "Revenue",
        referencedColumns: [],
        type: "MEASURE",
      },
    },
  ],
  data: [
    {
      columnDataLite: [
        {
          columnDataType: "CHAR",
          columnId: "col-region",
          dataValue: ["East", "West"],
        },
        {
          columnDataType: "INT64",
          columnId: "col-revenue",
          dataValue: [100, 250],
        },
      ],
      completionRatio: 1,
      samplingRatio: 1,
      totalRowCount: "2",
    },
  ],
};

/** Action payload with the embedded answer data at the root. */
export const actionDataPayload: ActionDataType = { embedAnswerData };

/** Action payload with the embedded answer data nested under `data`. */
export const nestedActionDataPayload: ActionDataType = {
  data: { embedAnswerData },
};

/** Action payload whose `data` is a single data set rather than an array of them. */
export const singleDataSetActionPayload: ActionDataType = {
  embedAnswerData: {
    columns: embedAnswerData.columns,
    data: embedAnswerData.data[0],
  },
};

export const spotterDataPayload: SpotterDataType = {
  data: {
    embedAnswerData: {
      columns: [
        {
          column: { name: "Product", id: "col-product", dataType: "CHAR" },
        },
        {
          column: { name: "Sales", id: "col-sales", dataType: "DOUBLE" },
        },
      ],
      data: {
        columnDataLite: [
          { columnId: "col-product", dataValue: ["Widget", "Gadget"] },
          { columnId: "col-sales", dataValue: [10.5, 20.25] },
        ],
      },
    },
  },
};

export const contextActionPayload: ContextActionDataType = {
  contextMenuPoints: {
    selectedPoints: [
      {
        selectedAttributes: [
          { column: { dataType: "CHAR", name: "Region" }, value: "East" },
        ],
        selectedMeasures: [
          { column: { dataType: "INT64", name: "Revenue" }, value: 100 },
        ],
      },
    ],
  },
};

/** A context menu opened with nothing selected reports the point under the cursor instead. */
export const clickedOnlyContextActionPayload: ContextActionDataType = {
  data: {
    contextMenuPoints: {
      selectedPoints: [],
      clickedPoints: [
        {
          selectedAttributes: [
            { column: { dataType: "CHAR", name: "Region" }, value: "West" },
          ],
        },
      ],
    },
  },
};

export const vizPointClickPayload: VizPointClickDataType = {
  type: "VizPointClick",
  data: {
    vizId: "viz-1",
    status: "COMPLETE",
    clickedPoints: [
      {
        selectedAttributes: [
          { column: { dataType: "CHAR", name: "Region" }, value: "East" },
        ],
        selectedMeasures: [
          { column: { dataType: "INT64", name: "Revenue" }, value: 100 },
        ],
      },
    ],
  },
};

/** A point click that reports a single `clickedPoint` rather than an array. */
export const singleClickedPointPayload: VizPointClickDataType = {
  type: "VizPointClick",
  data: {
    vizId: "viz-2",
    clickedPoint: {
      selectedAttributes: [
        { column: { dataType: "CHAR", name: "Region" }, value: "North" },
      ],
    },
  },
};
