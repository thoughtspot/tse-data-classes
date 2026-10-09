/**
 * Type definitions for the JSON payloads that ThoughtSpot sends.
 *
 * These types are deliberately permissive: they describe the attributes the data classes read and mark
 * everything else optional, because the payloads come from an external system whose shape varies by
 * release and by embed surface.  The full original payload is always retained on every data class as
 * `originalData`, so anything not modelled here can still be read directly.
 */

/** Data type reported for a column, e.g. "CHAR", "INT64", "DATE". */
export type ColumnDataType = string;

/** A single cell value as it arrives in a ThoughtSpot payload. */
export type PayloadCellValue = string | number;

/* -------------------------------------------------------------------------- */
/* Point selections (context menus and point clicks)                          */
/* -------------------------------------------------------------------------- */

export interface ColumnDescriptor {
  dataType: ColumnDataType;
  name: string;
}

export interface AttributeSelection {
  column: ColumnDescriptor;
  value: PayloadCellValue;
}

export interface MeasureSelection {
  column: ColumnDescriptor;
  value: number;
}

export interface VizPointSelection {
  selectedAttributes?: AttributeSelection[];
  deselectedAttributes?: AttributeSelection[];
  selectedMeasures?: MeasureSelection[];
  deselectedMeasures?: MeasureSelection[];
}

/* -------------------------------------------------------------------------- */
/* Embedded answer data (actions, EventType.Data, Spotter)                    */
/* -------------------------------------------------------------------------- */

export interface ReferencedColumn {
  __typename?: string;
  displayName: string;
}

export interface EmbedAnswerColumnDescriptor {
  __typename?: string;
  dataType: ColumnDataType;
  id: string;
  name: string;
  referencedColumns?: ReferencedColumn[];
  type?: string;
}

export interface EmbedAnswerColumn {
  __typename?: string;
  column: EmbedAnswerColumnDescriptor;
}

/** One column of values, matched back to its column metadata by `columnId`. */
export interface ColumnDataLite {
  columnDataType?: ColumnDataType;
  columnId: string;
  dataValue: PayloadCellValue[];
}

export interface EmbedAnswerDataSet {
  columnDataLite: ColumnDataLite[];
  completionRatio?: number;
  samplingRatio?: number;
  totalRowCount?: string;
}

/**
 * The embedded answer payload.  `data` arrives either as a single data set or as an array of them
 * depending on the ThoughtSpot version and the embed surface, so both are accepted.
 */
export interface EmbedAnswerData {
  columns: EmbedAnswerColumn[];
  data: EmbedAnswerDataSet | EmbedAnswerDataSet[];
}

/**
 * Sent by menu actions on answers, including individual visualizations in a liveboard.
 * The embedded answer data appears either at the root or nested under `data`.
 */
export interface ActionDataType {
  embedAnswerData?: EmbedAnswerData;
  data?: {
    embedAnswerData?: EmbedAnswerData;
  };
}

/** Sent by the Spotter data API.  Structurally a subset of {@link ActionDataType}. */
export interface SpotterDataType {
  embedAnswerData?: EmbedAnswerData;
  data?: {
    embedAnswerData?: EmbedAnswerData;
  };
}

/* -------------------------------------------------------------------------- */
/* Liveboard actions                                                          */
/* -------------------------------------------------------------------------- */

export interface PinboardContainer {
  answerId: string;
}

export interface PinboardDetails {
  __typename?: string;
  containers?: PinboardContainer[];
}

export interface LiveboardActionDataType {
  pinboardDetails?: PinboardDetails;
  data?: {
    pinboardDetails?: PinboardDetails;
  };
}

/* -------------------------------------------------------------------------- */
/* Context actions and point clicks                                           */
/* -------------------------------------------------------------------------- */

export interface ContextMenuPoints {
  selectedPoints?: VizPointSelection[];
  clickedPoints?: VizPointSelection[];
}

/** Sent by context actions on answers. */
export interface ContextActionDataType {
  contextMenuPoints?: ContextMenuPoints;
  data?: {
    contextMenuPoints?: ContextMenuPoints;
  };
}

export interface VizPointClickDataType {
  type?: string;
  data?: {
    clickedPoints?: VizPointSelection[];
    clickedPoint?: VizPointSelection;
    selectedPoints?: VizPointSelection[];
    embedAnswerData?: Record<string, unknown>;
    vizId?: string;
    status?: string;
  };
  status?: string;
}

/* -------------------------------------------------------------------------- */
/* Data APIs (search, answer, liveboard)                                      */
/* -------------------------------------------------------------------------- */

/**
 * One block of tabular results.  Row width is not fixed: an answer has as many values per row as it
 * has columns, and the value types follow the column data types.
 */
export interface DataContents {
  available_data_row_count?: number;
  column_names: string[];
  data_rows: PayloadCellValue[][];
  record_offset?: number;
  record_size?: number;
  returned_data_row_count?: number;
  sampling_ratio?: number;
}

/** A liveboard's results are one {@link DataContents} block per visualization. */
export interface LiveboardDataContents extends DataContents {
  visualization_id: string;
  visualization_name: string;
}

/** Sent by the liveboard data API. */
export interface LiveboardDataType {
  metadata_id?: string;
  metadata_name?: string;
  contents: LiveboardDataContents[];
}

/** Sent by the search data API. */
export interface SearchDataType {
  contents: DataContents[];
}

/** Sent by the fetch answer data API. */
export interface AnswerDataType {
  metadata_id?: string;
  metadata_name?: string;
  contents: DataContents[];
}
