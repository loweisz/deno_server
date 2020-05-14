import { parseDsn } from "./utils.ts";
function getPgEnv() {
    try {
        const env = Deno.env;
        const port = env.get("PGPORT");
        return {
            database: env.get("PGDATABASE"),
            hostname: env.get("PGHOST"),
            port: port !== undefined ? parseInt(port, 10) : undefined,
            user: env.get("PGUSER"),
            password: env.get("PGPASSWORD"),
            applicationName: env.get("PGAPPNAME"),
        };
    }
    catch (e) {
        // PermissionDenied (--allow-env not passed)
        return {};
    }
}
function isDefined(value) {
    return value !== undefined && value !== null;
}
class ConnectionParamsError extends Error {
    constructor(message) {
        super(message);
        this.name = "ConnectionParamsError";
    }
}
function select(sources, key) {
    return sources.map((s) => s[key]).find(isDefined);
}
function selectRequired(sources, key) {
    const result = select(sources, key);
    if (!isDefined(result)) {
        throw new ConnectionParamsError(`Required parameter ${key} not provided`);
    }
    return result;
}
function assertRequiredOptions(sources, requiredKeys) {
    const missingParams = [];
    for (const key of requiredKeys) {
        if (!isDefined(select(sources, key))) {
            missingParams.push(key);
        }
    }
    if (missingParams.length) {
        throw new ConnectionParamsError(formatMissingParams(missingParams));
    }
}
function formatMissingParams(missingParams) {
    return `Missing connection parameters: ${missingParams.join(", ")}. Connection parameters can be read from environment only if Deno is run with env permission (deno run --allow-env)`;
}
const DEFAULT_OPTIONS = {
    hostname: "127.0.0.1",
    port: 5432,
    applicationName: "deno_postgres",
};
function parseOptionsFromDsn(connString) {
    const dsn = parseDsn(connString);
    if (dsn.driver !== "postgres") {
        throw new Error(`Supplied DSN has invalid driver: ${dsn.driver}.`);
    }
    return {
        ...dsn,
        port: dsn.port ? parseInt(dsn.port, 10) : undefined,
        applicationName: dsn.params.application_name,
    };
}
export function createParams(config = {}) {
    if (typeof config === "string") {
        const dsn = parseOptionsFromDsn(config);
        return createParams(dsn);
    }
    const pgEnv = getPgEnv();
    const sources = [config, pgEnv, DEFAULT_OPTIONS];
    assertRequiredOptions(sources, ["database", "hostname", "port", "user", "applicationName"]);
    const params = {
        database: selectRequired(sources, "database"),
        hostname: selectRequired(sources, "hostname"),
        port: selectRequired(sources, "port"),
        applicationName: selectRequired(sources, "applicationName"),
        user: selectRequired(sources, "user"),
        password: select(sources, "password"),
    };
    if (isNaN(params.port)) {
        throw new ConnectionParamsError(`Invalid port ${params.port}`);
    }
    return params;
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/postgres/connection_params.ts.js.map