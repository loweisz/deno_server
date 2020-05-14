import { Connection } from "./connection.ts";
import { createParams } from "./connection_params.ts";
import { Query } from "./query.ts";
export class Client {
    constructor(config) {
        // Support `using` module
        this._aenter = this.connect;
        this._aexit = this.end;
        const connectionParams = createParams(config);
        this._connection = new Connection(connectionParams);
    }
    async connect() {
        await this._connection.startup();
        await this._connection.initSQL();
    }
    // TODO: can we use more specific type for args?
    async query(text, ...args) {
        const query = new Query(text, ...args);
        return await this._connection.query(query);
    }
    async multiQuery(queries) {
        const result = [];
        for (const query of queries) {
            result.push(await this.query(query));
        }
        return result;
    }
    async end() {
        await this._connection.end();
    }
}
export class PoolClient {
    constructor(connection, releaseCallback) {
        this._connection = connection;
        this._releaseCallback = releaseCallback;
    }
    async query(text, ...args) {
        const query = new Query(text, ...args);
        return await this._connection.query(query);
    }
    async release() {
        await this._releaseCallback();
    }
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/postgres/client.ts.js.map