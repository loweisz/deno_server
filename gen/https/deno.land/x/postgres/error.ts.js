export class PostgresError extends Error {
    constructor(fields) {
        super(fields.message);
        this.fields = fields;
        this.name = "PostgresError";
    }
}
export function parseError(msg) {
    // https://www.postgresql.org/docs/current/protocol-error-fields.html
    const errorFields = {};
    let byte;
    let char;
    let errorMsg;
    while ((byte = msg.reader.readByte())) {
        char = String.fromCharCode(byte);
        errorMsg = msg.reader.readCString();
        switch (char) {
            case "S":
                errorFields.severity = errorMsg;
                break;
            case "C":
                errorFields.code = errorMsg;
                break;
            case "M":
                errorFields.message = errorMsg;
                break;
            case "D":
                errorFields.detail = errorMsg;
                break;
            case "H":
                errorFields.hint = errorMsg;
                break;
            case "P":
                errorFields.position = errorMsg;
                break;
            case "p":
                errorFields.internalPosition = errorMsg;
                break;
            case "q":
                errorFields.internalQuery = errorMsg;
                break;
            case "W":
                errorFields.where = errorMsg;
                break;
            case "s":
                errorFields.schema = errorMsg;
                break;
            case "t":
                errorFields.table = errorMsg;
                break;
            case "c":
                errorFields.column = errorMsg;
                break;
            case "d":
                errorFields.dataTypeName = errorMsg;
                break;
            case "n":
                errorFields.constraint = errorMsg;
                break;
            case "F":
                errorFields.file = errorMsg;
                break;
            case "L":
                errorFields.line = errorMsg;
                break;
            case "R":
                errorFields.routine = errorMsg;
                break;
            default:
                // from Postgres docs
                // > Since more field types might be added in future,
                // > frontends should silently ignore fields of unrecognized type.
                break;
        }
    }
    return new PostgresError(errorFields);
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/postgres/error.ts.js.map