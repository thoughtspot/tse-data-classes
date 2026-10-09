/*!
 * tse-data-classes 2.0.1 - type declarations build
 * Classes to normalize and work with ThoughtSpot data payloads.
 * Copyright ThoughtSpot, Inc.  See LICENSE.md for license terms.
 * https://github.com/thoughtspot/tse-data-classes
 *
 * Generated file - do not edit.  Built by scripts/build-downloads.mjs.
 */
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


/**
 * A single cell in a normalized table.  `null` marks a cell with no value: a short row that was padded
 * out, or a column that was requested but does not exist in the payload.
 */
export type CellValue = string | number | null;
/**
 * Tabular data is indexed by column name; each entry holds that column's values in payload order.
 * Every column holds exactly `nbrRows` values, so the structure is always rectangular.
 */
export type TableData = {
    [columnName: string]: CellValue[];
};
/**
 * One row expressed as an object keyed by column name.
 */
export type RowObject = {
    [columnName: string]: CellValue;
};
/**
 * Represents the original payload, which can have different structures.
 */
export type AnyObject = Record<string, unknown>;
/**
 * Enum of data class types for explicit type hints.
 */
export declare enum DataClassType {
    ActionData = "ActionData",
    ContextActionData = "ContextActionData",
    VizPointClickData = "VizPointClickData",
    LiveboardActionData = "LiveboardActionData",
    LiveboardData = "LiveboardData",
    SearchData = "SearchData",
    AnswerData = "AnswerData",
    SpotterData = "SpotterData"
}
/** Sort direction for {@link sortObjects}. */
export type SortDirection = "asc" | "desc";
/**
 * Sorts an array of objects in place based on some attribute of those objects.
 * @param arrayOfObjs The array of objects to sort.  Sorted in place.
 * @param attr The attribute to use for sorting.
 * @param direction "asc" (the default) or "desc".
 * @returns The same array, sorted, so the call can be chained.
 */
export declare const sortObjects: <T extends Record<string, unknown>>(arrayOfObjs: T[], attr: keyof T, direction?: SortDirection) => T[];
/**
 * Shared base of every data class.  Retains the original payload and collects any problems found while
 * normalizing it, so a caller can tell a genuinely empty result apart from a payload that failed to
 * parse.
 *
 * Errors mean the data is incomplete or missing.  Warnings mean the data was usable but something was
 * adjusted (a duplicate column renamed, a short row padded).  Check {@link isValid} before trusting a
 * result, and read {@link errors} and {@link warnings} to find out what happened.
 */
export declare abstract class PayloadData {
    /** The original payload, exactly as it was received. */
    readonly originalData: AnyObject;
    protected _errors: string[];
    protected _warnings: string[];
    /**
     * @param originalData The original payload from the API or event.
     */
    constructor(originalData: AnyObject);
    /**
     * Problems that left the data incomplete or missing.
     * @returns A copy of the error messages.
     */
    get errors(): string[];
    /**
     * Adjustments made to keep the data usable, such as a renamed duplicate column or a padded row.
     * @returns A copy of the warning messages.
     */
    get warnings(): string[];
    /**
     * Whether the payload was normalized without errors.  An empty but well-formed result is valid.
     * @returns True when no errors were recorded.
     */
    get isValid(): boolean;
    /**
     * Records an error and logs it.  Only the payload's top-level shape is logged, never its contents,
     * so customer data is never written to the console.
     * @param message A description of the problem.
     */
    protected recordError(message: string): void;
    /**
     * Records a warning.  Warnings are collected but not logged; read them from {@link warnings}.
     * Repeated identical warnings are recorded once.
     * @param message A description of the adjustment that was made.
     */
    protected recordWarning(message: string): void;
}
/**
 * Holds data in a normalized tabular format for easy use and retrieval.  Base class of every data class
 * that represents a single table.
 */
export declare class TabularData extends PayloadData {
    /**
     * The data, stored by column with the column name as the key.  This makes it easy to get a subset of
     * columns in any order.  Treat it as read-only; use the accessors below to read the data.
     */
    data: TableData;
    /** The column names, in payload order. */
    protected _cns: string[];
    /** The number of rows in the data. */
    protected _nbrRows: number;
    /** Case-insensitive column name lookup: lower-cased name to the name as stored. */
    protected _columnNameMap: Map<string, string>;
    /**
     * Creates a new TabularData object.
     * @param originalData The original payload from the API.
     */
    constructor(originalData: AnyObject);
    /**
     * Sets the column names to use.  This also dictates the number of columns and should match the data.
     *
     * Column names are treated case-insensitively throughout, so a name that collides with one already
     * present (ignoring case) is given a numeric suffix such as "Region (2)".  Without this, two columns
     * with the same display name would share a single entry and their values would run together.  Every
     * rename is recorded as a warning.
     *
     * Setting the column names clears any data already populated, so always set the names first and then
     * populate.
     *
     * @param cns The names of the columns in the same order as the data.
     */
    set columnNames(cns: string[]);
    /**
     * Returns the column names.
     * @returns A copy of the column names, in payload order.
     */
    get columnNames(): string[];
    /**
     * Returns the number of columns in the tabular data.
     * @returns The number of columns.
     */
    get nbrColumns(): number;
    /**
     * Returns the number of rows of data.
     * @returns The number of rows of data.
     */
    get nbrRows(): number;
    /**
     * Finds a column name that does not collide, case-insensitively, with one already stored.
     * @param name The requested column name.
     * @returns The name itself, or a suffixed variant if the name was already taken.
     */
    private _uniqueColumnName;
    /**
     * Gets the stored column name from a potentially differently cased column name.
     * @param columnName The column name to look up (case-insensitive).
     * @returns The column name as stored, or undefined if not found.
     */
    getOriginalColumnName(columnName: string): string | undefined;
    /**
     * Checks if a column exists, comparing case-insensitively.
     * @param columnName The column name to check.
     * @returns True if the column exists, false otherwise.
     */
    hasColumn(columnName: string): boolean;
    /**
     * Populates the data by row.  This means the data is an array of arrays of the form:
     * [0]: [a|b|1]
     * [1]: [c|d|2]
     * etc
     * The order of the columns is assumed to be the same as the order of the column names.  Rows with
     * fewer values than there are columns are padded with null; values beyond the last column are dropped.
     * Either case is recorded as a warning rather than silently changing the row count.
     * @param data The data to populate.
     */
    populateDataByRow(data: CellValue[][]): void;
    /**
     * Populates the data by column.  In this case, the data is of the form:
     * [0]: [a|c]
     * [1]: [b|d]
     * [2]: [1|2]
     * The order of the columns is assumed to be the same as the order of the column names.  Columns
     * shorter than the longest one are padded with null so the table stays rectangular, and any mismatch
     * is recorded as a warning.
     * @param data The data to populate, one array per column.
     */
    populateDataByColumn(data: CellValue[][]): void;
    /**
     * Returns the set of columns as an array of rows.
     *  The columnNames are the sub-set of columns.  There are three options:
     *    null, undefined, or an empty array: return all columns
     *    string: return a single column with that name
     *    array of strings: return the columns with the given names
     *
     * The result is always rectangular with exactly {@link nbrRows} rows, whatever is requested.  A
     * column that does not exist yields a column of nulls and a recorded warning, so a bad column name
     * can never drop or shift the surrounding data.
     *
     * @param columnNames The names of the columns to return, matched case-insensitively.
     * @returns An array of arrays with the data in rows, e.g.
     * [
     * [a|b|1]
     * [c|d|2]
     * etc.
     * ]
     */
    getDataAsTable(columnNames?: string | string[] | null): CellValue[][];
    /**
     * Returns the data as an array of row objects keyed by column name, which is usually what you want
     * when rendering or mapping over rows: `rows[0]["Status"]`.
     * @param columnNames The names of the columns to return, matched case-insensitively.  All by default.
     * @returns An array of objects, one per row.
     */
    getDataAsObjects(columnNames?: string | string[] | null): RowObject[];
    /**
     * Normalizes the several accepted forms of a column selection into a list of names.
     * @param columnNames The requested columns.
     * @returns The column names to use, defaulting to all of them.
     */
    private _resolveRequestedColumns;
}
/**
 * This class handles data from Search and Answers where the action was from the main menu or primary
 * action.  This class also works for the EventType.Data events.
 * It does not work for liveboard visualizations or context menus.
 */
export declare class ActionData extends TabularData {
    /**
     * @param jsonData The payload data from the actions.
     * @returns a new ActionData object populated from the jsonData
     */
    static createFromJSON(jsonData: ActionDataType): ActionData;
}
/**
 * Creates a new Spotter data object with the results from Spotter API calls.
 *
 * Spotter returns the same embedded answer structure as {@link ActionData}, so auto-detection cannot
 * tell the two apart and resolves that shape to ActionData.  Pass `DataClassType.SpotterData` as a
 * type hint when you specifically want this class.
 */
export declare class SpotterData extends TabularData {
    /**
     * Creates a new Spotter data object.
     * @param jsonData The data returned from the Spotter API call.
     * @returns a new SpotterData object populated from the jsonData
     */
    static createFromJSON(jsonData: SpotterDataType): SpotterData;
}
/**
 * This class handles data from context actions as well as point clicks.
 */
export declare class ContextActionData extends TabularData {
    /**
     * Creates a new context action class from the payload.
     * @param jsonData The payload data from the actions.
     * @returns a new ContextActionData object populated from the jsonData
     */
    static createFromJSON(jsonData: ContextActionDataType): ContextActionData;
}
/**
 * Handles visualization point click events, keeping the click metadata alongside the clicked columns.
 */
export declare class VizPointClickData extends TabularData {
    clickType?: string;
    vizId?: string;
    status?: string;
    embedAnswerData?: Record<string, unknown>;
    /**
     * Creates a new point click data object.
     * @param jsonData The payload from the point click event.
     * @returns a new VizPointClickData object populated from the jsonData
     */
    static createFromJSON(jsonData: VizPointClickDataType): VizPointClickData;
}
/**
 * Represents an individual visualization in a liveboard.
 */
export declare class VizData extends TabularData {
    readonly vizId: string;
    readonly vizName: string;
    /**
     * @param vizId The ID of the visualization.
     * @param vizName The name of the visualization.
     * @param jsonData The payload for the individual visualization.
     */
    constructor(vizId: string, vizName: string, jsonData: AnyObject);
}
/**
 * Base of the data classes that hold a collection of visualizations rather than a single table.
 *
 * These are deliberately not {@link TabularData}: there are no columns or rows at this level, so
 * `nbrRows` and `getDataAsTable()` would only ever report empty.  Read the individual visualizations
 * with {@link vizIds} and {@link getViz}, each of which is a TabularData in its own right.
 */
export declare abstract class VizCollectionData extends PayloadData {
    protected _vizData: {
        [vizID: string]: VizData;
    };
    /**
     * The visualizations, keyed by visualization ID.
     * @returns The visualizations.  Prefer {@link getViz} and {@link vizIds}.
     */
    get vizData(): Readonly<{
        [vizID: string]: VizData;
    }>;
    /**
     * The IDs of the visualizations in the collection.
     * @returns The visualization IDs.
     */
    get vizIds(): string[];
    /**
     * The number of visualizations in the collection.
     * @returns The visualization count.
     */
    get nbrVisualizations(): number;
    /**
     * Gets a single visualization by ID.
     * @param vizId The ID of the visualization.
     * @returns The visualization, or undefined when the collection has no such ID.
     */
    getViz(vizId: string): VizData | undefined;
}
/**
 * Handles liveboard menu actions.  The payload lists the visualizations on the liveboard but carries no
 * data for them, so each {@link VizData} in the collection is empty.
 */
export declare class LiveboardActionData extends VizCollectionData {
    /**
     * Creates the liveboard action data object from the payload.
     * @param jsonData The data from the liveboard action payload.
     * @returns The new LiveboardActionData object.
     */
    static createFromJSON(jsonData: LiveboardActionDataType): LiveboardActionData;
}
/**
 * Represents the liveboard data class.  This is returned when calling the liveboard data API.
 * Note that this class isn't a tabular data class, but rather a collection of VizData objects which are.
 * This class only works with V2 liveboards.
 */
export declare class LiveboardData extends VizCollectionData {
    /**
     * Creates the liveboard data object from the payload.
     * @param jsonData The data from the liveboard data API.
     * @returns The new LiveboardData object.
     */
    static createFromJSON(jsonData: LiveboardDataType): LiveboardData;
}
/**
 * Creates a new search data object with the results of the Search Data and Fetch Answer Data v2.0 API
 * calls.
 */
export declare class SearchData extends TabularData {
    /**
     * Create a new search data object.
     * @param jsonData The data returned from the API call.
     * @returns a new SearchData object populated from the jsonData
     */
    static createFromJSON(jsonData: SearchDataType): SearchData;
}
/**
 * Creates a new get answer data object.
 * This data format comes from the payload.answerService.fetchData(offset, batchSize) call from custom
 * actions.  Note that AnswerData is simply SearchData with a couple extra attributes.
 */
export declare class AnswerData extends TabularData {
    /**
     * Creates a new get answer data object.
     * @param jsonData The response from a payload.answerService.fetchData(offset, batchSize)
     * @returns a new AnswerData object populated from the jsonData
     */
    static createFromJSON(jsonData: AnswerDataType): AnswerData;
}
/**
 * Union of every data class the generic factory can return.
 */
export type DataClassInstance = ActionData | ContextActionData | VizPointClickData | LiveboardActionData | LiveboardData | SearchData | AnswerData | SpotterData;
/**
 * Narrows a data class instance to one that holds a single table.
 *
 * The generic factory can return either a table ({@link TabularData}) or a collection of
 * visualizations ({@link VizCollectionData}), and only the former has columns and rows.  Use this to
 * branch safely on a result whose type you do not know.
 *
 * @param data The data class instance to test.
 * @returns True when the instance exposes the tabular API.
 */
export declare const isTabularData: (data: PayloadData) => data is TabularData;
/**
 * Narrows a data class instance to one that holds a collection of visualizations.
 * @param data The data class instance to test.
 * @returns True when the instance exposes the visualization collection API.
 */
export declare const isVizCollectionData: (data: PayloadData) => data is VizCollectionData;
/**
 * Detects the type of a ThoughtSpot payload without parsing it.  Useful when you want to branch on the
 * payload type yourself.
 * @param payload The JSON payload from ThoughtSpot.
 * @returns The detected type, or null when the payload matches no known shape.
 */
export declare const detectDataClassType: (payload: unknown) => DataClassType | null;
/**
 * Generic factory that detects the payload type and creates the appropriate data class.  Use this when
 * you do not know which payload you have.
 *
 * Note that a failure to parse a recognized payload does not throw: the returned object records what
 * went wrong, so check `isValid` and read `errors` before using the result.  Only an unrecognizable
 * payload throws.
 *
 * @param payload The JSON payload from ThoughtSpot (action, API response, event, etc.)
 * @param typeHint Optional hint that skips detection and parses the payload as that type.  Needed for
 *                 SpotterData, whose payload is indistinguishable from an ActionData payload.
 * @returns The appropriate data class instance populated with the payload data.
 * @throws Error if the payload type cannot be determined.
 *
 * @example
 * // Auto-detect type
 * const data = createDataClass(payload);
 *
 * // Explicit type hint, which also narrows the return type
 * const spotterData = createDataClass(payload, DataClassType.SpotterData);
 */
export declare function createDataClass(payload: unknown, typeHint: DataClassType.ActionData): ActionData;
export declare function createDataClass(payload: unknown, typeHint: DataClassType.ContextActionData): ContextActionData;
export declare function createDataClass(payload: unknown, typeHint: DataClassType.VizPointClickData): VizPointClickData;
export declare function createDataClass(payload: unknown, typeHint: DataClassType.LiveboardActionData): LiveboardActionData;
export declare function createDataClass(payload: unknown, typeHint: DataClassType.LiveboardData): LiveboardData;
export declare function createDataClass(payload: unknown, typeHint: DataClassType.SearchData): SearchData;
export declare function createDataClass(payload: unknown, typeHint: DataClassType.AnswerData): AnswerData;
export declare function createDataClass(payload: unknown, typeHint: DataClassType.SpotterData): SpotterData;
export declare function createDataClass(payload: unknown, typeHint?: DataClassType): DataClassInstance;
/**
 * Escapes a value for safe interpolation into HTML text or an attribute.  Column names and cell values
 * originate in ThoughtSpot worksheets and can be authored by users, so they are untrusted input and
 * must never reach the DOM unescaped.
 * @param value The value to escape.
 * @returns The value as HTML-safe text.
 */
export declare const escapeHTML: (value: unknown) => string;
/**
 * Converts a tabular data object to an HTML table for display.  All column names and values are
 * HTML-escaped.
 * @param tabularData The tabular data object to convert.
 * @returns The tabular data as an HTML table.
 * CSS classes are:
 * - tabular-data: the table class
 * - tabular-data-th: the table header class
 * - tabular-data: the table data class
 */
export declare const tabularDataToHTML: (tabularData: TabularData) => string;
/**
 * Converts tabular data to CSV text, with every field quoted and escaped.
 *
 * This returns the CSV itself, suitable for writing to a file or a clipboard.  Use
 * {@link tabularDataToCSVDataURI} when you need a `data:` URI for a download link.
 *
 * @param tabularData A TabularData object.
 * @returns The tabular data as CSV text using CRLF line endings, per RFC 4180.
 */
export declare const tabularDataToCSV: (tabularData: TabularData) => string;
/**
 * Converts tabular data to a `data:` URI that can be used as the href of a download link.
 *
 * The CSV body is percent-encoded, without which any `#`, `%`, or `&` in the data would truncate or
 * corrupt the URI.
 *
 * @param tabularData A TabularData object.
 * @returns A `data:text/csv` URI containing the encoded CSV.
 */
export declare const tabularDataToCSVDataURI: (tabularData: TabularData) => string;
