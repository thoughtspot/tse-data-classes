/*!
 * tse-data-classes 2.0.1 - ES module build
 * Classes to normalize and work with ThoughtSpot data payloads.
 * Copyright ThoughtSpot, Inc.  See LICENSE.md for license terms.
 * https://github.com/thoughtspot/tse-data-classes
 *
 * Generated file - do not edit.  Built by scripts/build-downloads.mjs.
 */
/**
 * Enum of data class types for explicit type hints.
 */
export var DataClassType;
(function (DataClassType) {
    DataClassType["ActionData"] = "ActionData";
    DataClassType["ContextActionData"] = "ContextActionData";
    DataClassType["VizPointClickData"] = "VizPointClickData";
    DataClassType["LiveboardActionData"] = "LiveboardActionData";
    DataClassType["LiveboardData"] = "LiveboardData";
    DataClassType["SearchData"] = "SearchData";
    DataClassType["AnswerData"] = "AnswerData";
    DataClassType["SpotterData"] = "SpotterData";
})(DataClassType || (DataClassType = {}));
/* -------------------------------------------------------------------------- */
/* Internal helpers                                                          */
/* -------------------------------------------------------------------------- */
/**
 * Combines and inverts column arrays into rows, so columns [[1,2,3],[4,5,6]] become
 * [[1,4],[2,5],[3,6]].  Used to convert the column-based internal representation to rows for display.
 *
 * The row count is passed in rather than inferred from the first column so that the result is
 * rectangular even when the columns are ragged: any column shorter than `nbrRows` is padded with null.
 *
 * @param columns The column arrays to combine and invert.
 * @param nbrRows The number of rows the result must have.
 */
const zip = (columns, nbrRows) => {
    const rows = [];
    for (let rowCnt = 0; rowCnt < nbrRows; rowCnt++) {
        rows.push(columns.map((column) => rowCnt < column.length ? column[rowCnt] : null));
    }
    return rows;
};
/**
 * Describes the shape of a payload for diagnostics.  Only the top-level key names are included, never
 * any values, so nothing that could contain customer data is written to the log.
 * @param payload The payload to describe.
 */
const describePayloadShape = (payload) => {
    if (payload === null || payload === undefined) {
        return String(payload);
    }
    if (typeof payload !== "object") {
        return typeof payload;
    }
    if (Array.isArray(payload)) {
        return `array(length=${payload.length})`;
    }
    return `object(keys=[${Object.keys(payload).join(", ")}])`;
};
/**
 * Narrows an unknown value to a plain object, or undefined when it is not one.
 * @param value The value to narrow.
 */
const asObject = (value) => {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value
        : undefined;
};
/**
 * Compares two present values of unknown type in a stable, predictable way.  Numbers compare
 * numerically, strings compare with `localeCompare`, booleans compare false before true, and mixed
 * types fall back to their string forms.  Missing values are handled by the caller.
 */
const comparePresentValues = (first, second) => {
    if (typeof first === "number" && typeof second === "number") {
        // NaN compares false against everything, so order it explicitly rather than leaving the
        // comparator inconsistent, which can scramble the whole array.
        if (Number.isNaN(first) || Number.isNaN(second)) {
            if (Number.isNaN(first) && Number.isNaN(second))
                return 0;
            return Number.isNaN(first) ? 1 : -1;
        }
        return first - second;
    }
    if (typeof first === "boolean" && typeof second === "boolean") {
        return Number(first) - Number(second);
    }
    return String(first).localeCompare(String(second));
};
/**
 * Sorts an array of objects in place based on some attribute of those objects.
 * @param arrayOfObjs The array of objects to sort.  Sorted in place.
 * @param attr The attribute to use for sorting.
 * @param direction "asc" (the default) or "desc".
 * @returns The same array, sorted, so the call can be chained.
 */
export const sortObjects = (arrayOfObjs, attr, direction = "asc") => {
    const sign = direction === "desc" ? -1 : 1;
    arrayOfObjs.sort((first, second) => {
        const firstValue = first[attr];
        const secondValue = second[attr];
        // Missing values sort last in both directions, so they never scatter through the results.
        const firstMissing = firstValue === null || firstValue === undefined;
        const secondMissing = secondValue === null || secondValue === undefined;
        if (firstMissing || secondMissing) {
            if (firstMissing && secondMissing)
                return 0;
            return firstMissing ? 1 : -1;
        }
        return sign * comparePresentValues(firstValue, secondValue);
    });
    return arrayOfObjs;
};
/* -------------------------------------------------------------------------- */
/* Base payload class                                                        */
/* -------------------------------------------------------------------------- */
/**
 * Shared base of every data class.  Retains the original payload and collects any problems found while
 * normalizing it, so a caller can tell a genuinely empty result apart from a payload that failed to
 * parse.
 *
 * Errors mean the data is incomplete or missing.  Warnings mean the data was usable but something was
 * adjusted (a duplicate column renamed, a short row padded).  Check {@link isValid} before trusting a
 * result, and read {@link errors} and {@link warnings} to find out what happened.
 */
export class PayloadData {
    /**
     * @param originalData The original payload from the API or event.
     */
    constructor(originalData) {
        this._errors = [];
        this._warnings = [];
        this.originalData = originalData;
    }
    /**
     * Problems that left the data incomplete or missing.
     * @returns A copy of the error messages.
     */
    get errors() {
        return Array.from(this._errors);
    }
    /**
     * Adjustments made to keep the data usable, such as a renamed duplicate column or a padded row.
     * @returns A copy of the warning messages.
     */
    get warnings() {
        return Array.from(this._warnings);
    }
    /**
     * Whether the payload was normalized without errors.  An empty but well-formed result is valid.
     * @returns True when no errors were recorded.
     */
    get isValid() {
        return this._errors.length === 0;
    }
    /**
     * Records an error and logs it.  Only the payload's top-level shape is logged, never its contents,
     * so customer data is never written to the console.
     * @param message A description of the problem.
     */
    recordError(message) {
        this._errors.push(message);
        console.error(`[tse-data-classes] ${this.constructor.name}: ${message} ` +
            `(payload shape: ${describePayloadShape(this.originalData)})`);
    }
    /**
     * Records a warning.  Warnings are collected but not logged; read them from {@link warnings}.
     * Repeated identical warnings are recorded once.
     * @param message A description of the adjustment that was made.
     */
    recordWarning(message) {
        if (!this._warnings.includes(message)) {
            this._warnings.push(message);
        }
    }
}
/* -------------------------------------------------------------------------- */
/* Tabular data                                                              */
/* -------------------------------------------------------------------------- */
/**
 * Holds data in a normalized tabular format for easy use and retrieval.  Base class of every data class
 * that represents a single table.
 */
export class TabularData extends PayloadData {
    /**
     * Creates a new TabularData object.
     * @param originalData The original payload from the API.
     */
    constructor(originalData) {
        super(originalData);
        this.data = {};
        this._cns = [];
        this._nbrRows = 0;
        this._columnNameMap = new Map();
    }
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
    set columnNames(cns) {
        this._cns = [];
        this._columnNameMap.clear();
        this.data = {};
        this._nbrRows = 0;
        for (const requestedName of cns) {
            const name = this._uniqueColumnName(requestedName);
            this._cns.push(name);
            this._columnNameMap.set(name.toLowerCase(), name);
        }
    }
    /**
     * Returns the column names.
     * @returns A copy of the column names, in payload order.
     */
    get columnNames() {
        return Array.from(this._cns); // avoid manipulation.
    }
    /**
     * Returns the number of columns in the tabular data.
     * @returns The number of columns.
     */
    get nbrColumns() {
        return this._cns.length;
    }
    /**
     * Returns the number of rows of data.
     * @returns The number of rows of data.
     */
    get nbrRows() {
        return this._nbrRows;
    }
    /**
     * Finds a column name that does not collide, case-insensitively, with one already stored.
     * @param name The requested column name.
     * @returns The name itself, or a suffixed variant if the name was already taken.
     */
    _uniqueColumnName(name) {
        if (!this._columnNameMap.has(name.toLowerCase())) {
            return name;
        }
        let suffix = 2;
        let candidate = `${name} (${suffix})`;
        while (this._columnNameMap.has(candidate.toLowerCase())) {
            suffix += 1;
            candidate = `${name} (${suffix})`;
        }
        this.recordWarning(`Duplicate column name "${name}" was renamed to "${candidate}".`);
        return candidate;
    }
    /**
     * Gets the stored column name from a potentially differently cased column name.
     * @param columnName The column name to look up (case-insensitive).
     * @returns The column name as stored, or undefined if not found.
     */
    getOriginalColumnName(columnName) {
        return this._columnNameMap.get(columnName.toLowerCase());
    }
    /**
     * Checks if a column exists, comparing case-insensitively.
     * @param columnName The column name to check.
     * @returns True if the column exists, false otherwise.
     */
    hasColumn(columnName) {
        return this._columnNameMap.has(columnName.toLowerCase());
    }
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
    populateDataByRow(data) {
        const nbrColumns = this._cns.length;
        for (const name of this._cns) {
            this.data[name] = [];
        }
        for (let rowCnt = 0; rowCnt < data.length; rowCnt++) {
            const row = data[rowCnt] ?? [];
            if (row.length !== nbrColumns) {
                this.recordWarning(`Row width mismatch: expected ${nbrColumns} values per row but row ${rowCnt} has ` +
                    `${row.length}.  Missing values are null; extra values are dropped.`);
            }
            for (let colCnt = 0; colCnt < nbrColumns; colCnt++) {
                this.data[this._cns[colCnt]].push(colCnt < row.length ? row[colCnt] : null);
            }
        }
        // Set only after the loop so the row count always matches what was actually stored.
        this._nbrRows = data.length;
    }
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
    populateDataByColumn(data) {
        const nbrColumns = this._cns.length;
        if (data.length !== nbrColumns) {
            this.recordWarning(`Column count mismatch: ${nbrColumns} column names but ${data.length} columns of data.`);
        }
        let nbrRows = 0;
        for (const column of data) {
            nbrRows = Math.max(nbrRows, column?.length ?? 0);
        }
        for (let colCnt = 0; colCnt < nbrColumns; colCnt++) {
            const colName = this._cns[colCnt];
            const column = data[colCnt] ?? [];
            if (column.length !== nbrRows) {
                this.recordWarning(`Ragged column data: column "${colName}" has ${column.length} values but the longest ` +
                    `column has ${nbrRows}.  Missing values are null.`);
            }
            const values = Array.from(column); // shallow copy the data.
            while (values.length < nbrRows) {
                values.push(null);
            }
            this.data[colName] = values;
        }
        this._nbrRows = nbrRows;
    }
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
    getDataAsTable(columnNames) {
        const names = this._resolveRequestedColumns(columnNames);
        const columns = names.map((cname) => {
            // Use case-insensitive lookup to find the stored column name.
            const originalName = this.getOriginalColumnName(cname);
            if (originalName === undefined) {
                this.recordWarning(`Column "${cname}" not found (case-insensitive search); returning nulls for it.`);
                return new Array(this._nbrRows).fill(null);
            }
            return this.data[originalName] ?? [];
        });
        return zip(columns, this._nbrRows);
    }
    /**
     * Returns the data as an array of row objects keyed by column name, which is usually what you want
     * when rendering or mapping over rows: `rows[0]["Status"]`.
     * @param columnNames The names of the columns to return, matched case-insensitively.  All by default.
     * @returns An array of objects, one per row.
     */
    getDataAsObjects(columnNames) {
        const names = this._resolveRequestedColumns(columnNames).map(
        // Report the stored casing so keys are consistent regardless of how they were requested.
        (cname) => this.getOriginalColumnName(cname) ?? cname);
        return this.getDataAsTable(names).map((row) => {
            const rowObject = {};
            names.forEach((name, idx) => {
                rowObject[name] = row[idx];
            });
            return rowObject;
        });
    }
    /**
     * Normalizes the several accepted forms of a column selection into a list of names.
     * @param columnNames The requested columns.
     * @returns The column names to use, defaulting to all of them.
     */
    _resolveRequestedColumns(columnNames) {
        if (columnNames === null || columnNames === undefined) {
            return this.columnNames;
        }
        if (typeof columnNames === "string") {
            return [columnNames];
        }
        return columnNames.length === 0 ? this.columnNames : columnNames;
    }
}
/* -------------------------------------------------------------------------- */
/* Point selection helpers                                                   */
/* -------------------------------------------------------------------------- */
const columnAlreadyAdded = (columnNames, columnName) => {
    return columnNames.some((existingColumnName) => existingColumnName.toLowerCase() === columnName.toLowerCase());
};
const addSelectionsToColumns = (selections, columnNames, columnValues) => {
    if (!selections) {
        return;
    }
    for (const selection of selections) {
        const columnName = selection.column.name;
        if (columnAlreadyAdded(columnNames, columnName)) {
            continue;
        }
        columnNames.push(columnName);
        columnValues.push([selection.value]);
    }
};
const appendVizPointSelectionData = (point, columnNames, columnValues) => {
    addSelectionsToColumns(point.selectedAttributes, columnNames, columnValues);
    addSelectionsToColumns(point.deselectedAttributes, columnNames, columnValues);
    addSelectionsToColumns(point.selectedMeasures, columnNames, columnValues);
    addSelectionsToColumns(point.deselectedMeasures, columnNames, columnValues);
};
/* -------------------------------------------------------------------------- */
/* Embedded answer data extraction (shared by ActionData and SpotterData)    */
/* -------------------------------------------------------------------------- */
/**
 * Populates a tabular data object from an embedded answer payload.  Both action payloads and Spotter
 * payloads use this structure: column metadata in `columns`, and values in `columnDataLite` keyed back
 * to the metadata by column ID.
 *
 * @param target The data object to populate.
 * @param dataRoot The embedded answer payload.
 * @param recordError Records a problem on the target.
 */
const populateFromEmbedAnswerData = (target, dataRoot, recordError) => {
    const columns = dataRoot.columns;
    if (!Array.isArray(columns)) {
        recordError("embedAnswerData.columns is missing or is not an array.");
        return;
    }
    // Note that you can get more column names than data, and that the data columns are aligned by
    // column ID rather than by position.
    const originalColumnNames = [];
    const columnIds = [];
    for (const column of columns) {
        originalColumnNames.push(column?.column?.name);
        columnIds.push(column?.column?.id);
    }
    // Handle both shapes: `data` as an array of data sets, or as a single data set.
    const dataContainer = Array.isArray(dataRoot.data)
        ? dataRoot.data[0]
        : dataRoot.data;
    const dataSet = dataContainer?.columnDataLite;
    if (!Array.isArray(dataSet)) {
        recordError("embedAnswerData is missing its columnDataLite array.");
        return;
    }
    const data = [];
    const columnNames = [];
    for (const columnData of dataSet) {
        const columnIdx = columnIds.indexOf(columnData.columnId); // find the right column.
        if (columnIdx < 0) {
            recordError(`Column ID "${columnData.columnId}" was not found in the column metadata; its values were dropped.`);
            continue;
        }
        columnNames.push(originalColumnNames[columnIdx]);
        data.push(columnData.dataValue ?? []); // should be an array of column values.
    }
    target.columnNames = columnNames;
    target.populateDataByColumn(data);
};
/**
 * Finds the embedded answer payload, which appears either at the root or nested under `data`.
 * @param jsonData The payload to search.
 */
const findEmbedAnswerData = (jsonData) => {
    return jsonData?.embedAnswerData ?? jsonData?.data?.embedAnswerData;
};
/* -------------------------------------------------------------------------- */
/* Data classes                                                              */
/* -------------------------------------------------------------------------- */
/**
 * This class handles data from Search and Answers where the action was from the main menu or primary
 * action.  This class also works for the EventType.Data events.
 * It does not work for liveboard visualizations or context menus.
 */
export class ActionData extends TabularData {
    /**
     * @param jsonData The payload data from the actions.
     * @returns a new ActionData object populated from the jsonData
     */
    static createFromJSON(jsonData) {
        const actionData = new ActionData(jsonData);
        const recordError = (message) => actionData.recordError(message);
        // Handle both structures: jsonData.data.embedAnswerData or jsonData.embedAnswerData.
        const dataRoot = findEmbedAnswerData(jsonData);
        if (!dataRoot) {
            recordError("No embedAnswerData was found in the payload.");
            return actionData;
        }
        populateFromEmbedAnswerData(actionData, dataRoot, recordError);
        return actionData;
    }
}
/**
 * Creates a new Spotter data object with the results from Spotter API calls.
 *
 * Spotter returns the same embedded answer structure as {@link ActionData}, so auto-detection cannot
 * tell the two apart and resolves that shape to ActionData.  Pass `DataClassType.SpotterData` as a
 * type hint when you specifically want this class.
 */
export class SpotterData extends TabularData {
    /**
     * Creates a new Spotter data object.
     * @param jsonData The data returned from the Spotter API call.
     * @returns a new SpotterData object populated from the jsonData
     */
    static createFromJSON(jsonData) {
        const spotterData = new SpotterData(jsonData);
        const recordError = (message) => spotterData.recordError(message);
        const dataRoot = findEmbedAnswerData(jsonData);
        if (!dataRoot) {
            recordError("No embedAnswerData was found in the payload.");
            return spotterData;
        }
        populateFromEmbedAnswerData(spotterData, dataRoot, recordError);
        return spotterData;
    }
}
/**
 * This class handles data from context actions as well as point clicks.
 */
export class ContextActionData extends TabularData {
    /**
     * Creates a new context action class from the payload.
     * @param jsonData The payload data from the actions.
     * @returns a new ContextActionData object populated from the jsonData
     */
    static createFromJSON(jsonData) {
        const contextActionData = new ContextActionData(jsonData);
        // The actual data selected is stored in contextMenuPoints, either under jsonData or jsonData.data.
        const contextMenuPoints = jsonData?.contextMenuPoints ?? jsonData?.data?.contextMenuPoints;
        if (!contextMenuPoints) {
            contextActionData.recordError("No contextMenuPoints were found in the payload.");
            return contextActionData;
        }
        const columnNames = [];
        const columnValues = [];
        // A context menu opened without a selection reports the point under the cursor in clickedPoints,
        // so fall back to that when nothing is selected.
        const selectedPoints = contextMenuPoints.selectedPoints ?? [];
        const points = selectedPoints.length
            ? selectedPoints
            : (contextMenuPoints.clickedPoints ?? []);
        for (const point of points) {
            appendVizPointSelectionData(point, columnNames, columnValues);
        }
        if (columnNames.length === 0) {
            contextActionData.recordError("No selected or clicked points were found in contextMenuPoints.");
            return contextActionData;
        }
        contextActionData.columnNames = columnNames;
        contextActionData.populateDataByColumn(columnValues);
        return contextActionData;
    }
}
/**
 * Handles visualization point click events, keeping the click metadata alongside the clicked columns.
 */
export class VizPointClickData extends TabularData {
    /**
     * Creates a new point click data object.
     * @param jsonData The payload from the point click event.
     * @returns a new VizPointClickData object populated from the jsonData
     */
    static createFromJSON(jsonData) {
        const vizPointClickData = new VizPointClickData(jsonData);
        vizPointClickData.clickType = jsonData?.type;
        const data = jsonData?.data;
        if (!data) {
            vizPointClickData.recordError("No data payload was found for the viz point click.");
            return vizPointClickData;
        }
        vizPointClickData.vizId = data.vizId;
        vizPointClickData.status = data.status ?? jsonData.status;
        vizPointClickData.embedAnswerData = data.embedAnswerData;
        const columnNames = [];
        const columnValues = [];
        // Prefer the clicked points, then a single clicked point, then the wider selection.
        const clickedPoints = data.clickedPoints ?? (data.clickedPoint ? [data.clickedPoint] : []);
        const points = clickedPoints.length
            ? clickedPoints
            : (data.selectedPoints ?? []);
        for (const point of points) {
            appendVizPointSelectionData(point, columnNames, columnValues);
        }
        if (columnNames.length === 0) {
            vizPointClickData.recordError("No clicked or selected point data was found in the payload.");
            return vizPointClickData;
        }
        vizPointClickData.columnNames = columnNames;
        vizPointClickData.populateDataByColumn(columnValues);
        return vizPointClickData;
    }
}
/**
 * Represents an individual visualization in a liveboard.
 */
export class VizData extends TabularData {
    /**
     * @param vizId The ID of the visualization.
     * @param vizName The name of the visualization.
     * @param jsonData The payload for the individual visualization.
     */
    constructor(vizId, vizName, jsonData) {
        super(jsonData);
        this.vizId = vizId;
        this.vizName = vizName;
    }
}
/**
 * Base of the data classes that hold a collection of visualizations rather than a single table.
 *
 * These are deliberately not {@link TabularData}: there are no columns or rows at this level, so
 * `nbrRows` and `getDataAsTable()` would only ever report empty.  Read the individual visualizations
 * with {@link vizIds} and {@link getViz}, each of which is a TabularData in its own right.
 */
export class VizCollectionData extends PayloadData {
    constructor() {
        super(...arguments);
        this._vizData = {};
    }
    /**
     * The visualizations, keyed by visualization ID.
     * @returns The visualizations.  Prefer {@link getViz} and {@link vizIds}.
     */
    get vizData() {
        return this._vizData;
    }
    /**
     * The IDs of the visualizations in the collection.
     * @returns The visualization IDs.
     */
    get vizIds() {
        return Object.keys(this._vizData);
    }
    /**
     * The number of visualizations in the collection.
     * @returns The visualization count.
     */
    get nbrVisualizations() {
        return this.vizIds.length;
    }
    /**
     * Gets a single visualization by ID.
     * @param vizId The ID of the visualization.
     * @returns The visualization, or undefined when the collection has no such ID.
     */
    getViz(vizId) {
        return this._vizData[vizId];
    }
}
/**
 * Handles liveboard menu actions.  The payload lists the visualizations on the liveboard but carries no
 * data for them, so each {@link VizData} in the collection is empty.
 */
export class LiveboardActionData extends VizCollectionData {
    /**
     * Creates the liveboard action data object from the payload.
     * @param jsonData The data from the liveboard action payload.
     * @returns The new LiveboardActionData object.
     */
    static createFromJSON(jsonData) {
        const liveboardActionData = new LiveboardActionData(jsonData);
        // Handle both structures: pinboardDetails at the root or nested under data.
        const containers = jsonData?.pinboardDetails?.containers ??
            jsonData?.data?.pinboardDetails?.containers;
        if (!containers) {
            liveboardActionData.recordError("No pinboardDetails.containers were found in the payload.");
            return liveboardActionData;
        }
        // Create empty VizData objects for each visualization; this payload carries no data for them.
        for (const container of containers) {
            liveboardActionData._vizData[container.answerId] = new VizData(container.answerId, // Use answerId as the viz ID.
            "", // No visualization name in this payload.
            container);
        }
        return liveboardActionData;
    }
}
/**
 * Represents the liveboard data class.  This is returned when calling the liveboard data API.
 * Note that this class isn't a tabular data class, but rather a collection of VizData objects which are.
 * This class only works with V2 liveboards.
 */
export class LiveboardData extends VizCollectionData {
    /**
     * Creates the liveboard data object from the payload.
     * @param jsonData The data from the liveboard data API.
     * @returns The new LiveboardData object.
     */
    static createFromJSON(jsonData) {
        const liveboardData = new LiveboardData(jsonData);
        const contents = jsonData?.contents;
        if (!Array.isArray(contents)) {
            liveboardData.recordError("No contents array was found in the liveboard payload.");
            return liveboardData;
        }
        for (const viz of contents) {
            // Results have an array of visualizations.
            const vizData = new VizData(viz.visualization_id, viz.visualization_name, viz);
            vizData.columnNames = viz.column_names ?? [];
            vizData.populateDataByRow(viz.data_rows ?? []);
            liveboardData._vizData[viz.visualization_id] = vizData;
        }
        return liveboardData;
    }
}
/**
 * Populates a tabular data object from the first block of a `contents` array, the shape used by the
 * search and answer data APIs.
 * @param target The data object to populate.
 * @param contents The contents array from the payload.
 */
const populateFromContents = (target, contents, recordError) => {
    if (!Array.isArray(contents)) {
        recordError("No contents array was found in the payload.");
        return;
    }
    if (contents.length === 0) {
        recordError("The contents array in the payload is empty.");
        return;
    }
    const block = contents[0];
    target.columnNames = block?.column_names ?? [];
    target.populateDataByRow(block?.data_rows ?? []);
};
/**
 * Creates a new search data object with the results of the Search Data and Fetch Answer Data v2.0 API
 * calls.
 */
export class SearchData extends TabularData {
    /**
     * Create a new search data object.
     * @param jsonData The data returned from the API call.
     * @returns a new SearchData object populated from the jsonData
     */
    static createFromJSON(jsonData) {
        const searchData = new SearchData(jsonData);
        populateFromContents(searchData, jsonData?.contents, (message) => searchData.recordError(message));
        return searchData;
    }
}
/**
 * Creates a new get answer data object.
 * This data format comes from the payload.answerService.fetchData(offset, batchSize) call from custom
 * actions.  Note that AnswerData is simply SearchData with a couple extra attributes.
 */
export class AnswerData extends TabularData {
    /**
     * Creates a new get answer data object.
     * @param jsonData The response from a payload.answerService.fetchData(offset, batchSize)
     * @returns a new AnswerData object populated from the jsonData
     */
    static createFromJSON(jsonData) {
        const answerData = new AnswerData(jsonData);
        populateFromContents(answerData, jsonData?.contents, (message) => answerData.recordError(message));
        return answerData;
    }
}
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
export const isTabularData = (data) => {
    return data instanceof TabularData;
};
/**
 * Narrows a data class instance to one that holds a collection of visualizations.
 * @param data The data class instance to test.
 * @returns True when the instance exposes the visualization collection API.
 */
export const isVizCollectionData = (data) => {
    return data instanceof VizCollectionData;
};
/**
 * Detects the payload type based on its structure.
 * @param payload The payload to inspect.
 * @returns The detected DataClassType, or null if the type cannot be determined.
 */
const detectPayloadType = (payload) => {
    const p = asObject(payload);
    if (!p) {
        return null;
    }
    const nested = asObject(p.data);
    // ContextActionData: has contextMenuPoints.
    if (p.contextMenuPoints || nested?.contextMenuPoints) {
        return DataClassType.ContextActionData;
    }
    // VizPointClickData: has a type and a click-related data structure.
    if (typeof p.type === "string" &&
        nested &&
        (nested.clickedPoints || nested.clickedPoint || nested.selectedPoints)) {
        return DataClassType.VizPointClickData;
    }
    // LiveboardActionData: pinboardDetails at the root or under data.
    for (const pinboardDetails of [
        asObject(p.pinboardDetails),
        asObject(nested?.pinboardDetails),
    ]) {
        if (pinboardDetails &&
            (pinboardDetails.__typename === "Pinboard" || pinboardDetails.containers)) {
            return DataClassType.LiveboardActionData;
        }
    }
    // The contents-based types: LiveboardData, AnswerData, and SearchData.  An empty contents array is
    // still a valid, detectable payload, so length is never required here.
    if (Array.isArray(p.contents)) {
        const firstBlock = asObject(p.contents[0]);
        // A liveboard reports one block per visualization.
        if (firstBlock?.visualization_id !== undefined) {
            return DataClassType.LiveboardData;
        }
        // With no blocks at all there is nothing to inspect, so fall back to the root metadata: an
        // answer with no rows still has one block, so an empty array means an empty liveboard.
        if (firstBlock === undefined) {
            return p.metadata_id !== undefined
                ? DataClassType.LiveboardData
                : DataClassType.SearchData;
        }
        // AnswerData carries metadata about the answer it came from; SearchData does not.
        return p.metadata_id !== undefined
            ? DataClassType.AnswerData
            : DataClassType.SearchData;
    }
    // ActionData: embedAnswerData at the root or under data.  Spotter payloads use the same shape and
    // carry nothing to distinguish them, and ActionData parses a superset of it, so this shape always
    // resolves to ActionData.  Pass DataClassType.SpotterData explicitly to get a SpotterData instead.
    if (p.embedAnswerData || nested?.embedAnswerData) {
        return DataClassType.ActionData;
    }
    return null;
};
/**
 * Creates a data class instance using an explicit type.
 * @param payload The payload to parse.
 * @param type The data class to create.
 */
const createFromJSONWithType = (payload, type) => {
    switch (type) {
        case DataClassType.ActionData:
            return ActionData.createFromJSON(payload);
        case DataClassType.ContextActionData:
            return ContextActionData.createFromJSON(payload);
        case DataClassType.VizPointClickData:
            return VizPointClickData.createFromJSON(payload);
        case DataClassType.LiveboardActionData:
            return LiveboardActionData.createFromJSON(payload);
        case DataClassType.LiveboardData:
            return LiveboardData.createFromJSON(payload);
        case DataClassType.SearchData:
            return SearchData.createFromJSON(payload);
        case DataClassType.AnswerData:
            return AnswerData.createFromJSON(payload);
        case DataClassType.SpotterData:
            return SpotterData.createFromJSON(payload);
        default:
            throw new Error(`Unknown data class type: ${type}`);
    }
};
/**
 * Detects the type of a ThoughtSpot payload without parsing it.  Useful when you want to branch on the
 * payload type yourself.
 * @param payload The JSON payload from ThoughtSpot.
 * @returns The detected type, or null when the payload matches no known shape.
 */
export const detectDataClassType = (payload) => {
    return detectPayloadType(payload);
};
export function createDataClass(payload, typeHint) {
    // If a type hint is provided, use it directly.
    if (typeHint) {
        return createFromJSONWithType(payload, typeHint);
    }
    const detectedType = detectPayloadType(payload);
    if (!detectedType) {
        throw new Error("Unable to determine payload type. Please provide a typeHint parameter or verify the " +
            `payload structure (payload shape: ${describePayloadShape(payload)}).`);
    }
    return createFromJSONWithType(payload, detectedType);
}
/* -------------------------------------------------------------------------- */
/* Exporters                                                                 */
/* -------------------------------------------------------------------------- */
const HTML_ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};
/**
 * Escapes a value for safe interpolation into HTML text or an attribute.  Column names and cell values
 * originate in ThoughtSpot worksheets and can be authored by users, so they are untrusted input and
 * must never reach the DOM unescaped.
 * @param value The value to escape.
 * @returns The value as HTML-safe text.
 */
export const escapeHTML = (value) => {
    return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
};
/**
 * Characters that make a spreadsheet treat a cell as a formula rather than as text.
 */
const CSV_INJECTION_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];
/**
 * Escapes a value for a quoted CSV field.
 *
 * Two things happen here.  Embedded double quotes are doubled, as CSV requires.  And a string that
 * starts with a character a spreadsheet reads as the start of a formula is prefixed with a single
 * quote, which forces Excel and Sheets to treat it as text.  Without that, a cell such as
 * `=HYPERLINK(...)` or `@SUM(A1)` executes when the exported file is opened.  Values that merely look
 * like negative numbers are left alone so ordinary numeric data stays clean.
 *
 * @param value The cell value to escape.
 * @returns The escaped text, without the surrounding quotes.
 */
const escapeCSVValue = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    const startsFormula = typeof value === "string" &&
        CSV_INJECTION_PREFIXES.some((prefix) => text.startsWith(prefix)) &&
        !Number.isFinite(Number(text)); // "-5" is just a number; "-5+cmd()" is not.
    const guarded = startsFormula ? `'${text}` : text;
    return guarded.replaceAll('"', '""'); // convert quotes for embedding.
};
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
export const tabularDataToHTML = (tabularData) => {
    const columnNames = tabularData.columnNames;
    let table = '<table class="tabular-data">';
    // Add a header.
    table += "<tr>";
    for (const columnName of columnNames) {
        table += `<th class="tabular-data-th">${escapeHTML(columnName)}</th>`;
    }
    table += "</tr>";
    for (const row of tabularData.getDataAsTable()) {
        table += "<tr>";
        for (let colCnt = 0; colCnt < columnNames.length; colCnt++) {
            table += `<td class="tabular-data">${escapeHTML(row[colCnt])}</td>`;
        }
        table += "</tr>";
    }
    table += "</table>";
    return table;
};
/**
 * Converts tabular data to CSV text, with every field quoted and escaped.
 *
 * This returns the CSV itself, suitable for writing to a file or a clipboard.  Use
 * {@link tabularDataToCSVDataURI} when you need a `data:` URI for a download link.
 *
 * @param tabularData A TabularData object.
 * @returns The tabular data as CSV text using CRLF line endings, per RFC 4180.
 */
export const tabularDataToCSV = (tabularData) => {
    const toRow = (values) => '"' + values.map(escapeCSVValue).join('","') + '"\r\n';
    // Get the column names as header values.
    let csv = toRow(tabularData.columnNames);
    // Get the data as a table and add it to the CSV.
    for (const row of tabularData.getDataAsTable()) {
        csv += toRow(row);
    }
    return csv;
};
/**
 * Converts tabular data to a `data:` URI that can be used as the href of a download link.
 *
 * The CSV body is percent-encoded, without which any `#`, `%`, or `&` in the data would truncate or
 * corrupt the URI.
 *
 * @param tabularData A TabularData object.
 * @returns A `data:text/csv` URI containing the encoded CSV.
 */
export const tabularDataToCSVDataURI = (tabularData) => {
    return `data:text/csv;charset=utf-8,${encodeURIComponent(tabularDataToCSV(tabularData))}`;
};
