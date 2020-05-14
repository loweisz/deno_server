import { encode } from "./encode.ts";
import { decode } from "./decode.ts";
export class QueryResult {
    constructor(query) {
        this.query = query;
        this._done = false;
        this.rows = []; // actual results
    }
    handleRowDescription(description) {
        this.rowDescription = description;
    }
    _parseDataRow(dataRow) {
        const parsedRow = [];
        for (let i = 0, len = dataRow.length; i < len; i++) {
            const column = this.rowDescription.columns[i];
            const rawValue = dataRow[i];
            if (rawValue === null) {
                parsedRow.push(null);
            }
            else {
                parsedRow.push(decode(rawValue, column));
            }
        }
        return parsedRow;
    }
    handleDataRow(dataRow) {
        if (this._done) {
            throw new Error("New data row, after result if done.");
        }
        const parsedRow = this._parseDataRow(dataRow);
        this.rows.push(parsedRow);
    }
    rowsOfObjects() {
        return this.rows.map((row) => {
            const rv = {};
            this.rowDescription.columns.forEach((column, index) => {
                rv[column.name] = row[index];
            });
            return rv;
        });
    }
    done() {
        this._done = true;
    }
}
export class Query {
    // TODO: can we use more specific type for args?
    constructor(text, ...args) {
        let config;
        if (typeof text === "string") {
            config = { text, args };
        }
        else {
            config = text;
        }
        this.text = config.text;
        this.args = this._prepareArgs(config);
        this.result = new QueryResult(this);
    }
    _prepareArgs(config) {
        const encodingFn = config.encoder ? config.encoder : encode;
        return (config.args || []).map(encodingFn);
    }
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/postgres/query.ts.js.map