import { PoolClient } from "./client.ts";
import { Connection } from "./connection.ts";
import { createParams, } from "./connection_params.ts";
import { DeferredStack } from "./deferred.ts";
import { Query } from "./query.ts";
export class Pool {
    constructor(connectionParams, maxSize, lazy) {
        // Support `using` module
        this._aenter = () => { };
        this._aexit = this.end;
        this._connectionParams = createParams(connectionParams);
        this._maxSize = maxSize;
        this._lazy = !!lazy;
        this._ready = this._startup();
    }
    async _createConnection() {
        const connection = new Connection(this._connectionParams);
        await connection.startup();
        await connection.initSQL();
        return connection;
    }
    /** pool max size */
    get maxSize() {
        return this._maxSize;
    }
    /** number of connections created */
    get size() {
        return this._availableConnections.size;
    }
    /** number of available connections */
    get available() {
        return this._availableConnections.available;
    }
    async _startup() {
        const initSize = this._lazy ? 1 : this._maxSize;
        const connecting = [...Array(initSize)].map(async () => await this._createConnection());
        this._connections = await Promise.all(connecting);
        this._availableConnections = new DeferredStack(this._maxSize, this._connections, this._createConnection.bind(this));
    }
    async _execute(query) {
        await this._ready;
        const connection = await this._availableConnections.pop();
        try {
            const result = await connection.query(query);
            return result;
        }
        catch (error) {
            throw error;
        }
        finally {
            this._availableConnections.push(connection);
        }
    }
    async connect() {
        await this._ready;
        const connection = await this._availableConnections.pop();
        const release = () => this._availableConnections.push(connection);
        return new PoolClient(connection, release);
    }
    // TODO: can we use more specific type for args?
    async query(text, ...args) {
        const query = new Query(text, ...args);
        return await this._execute(query);
    }
    async end() {
        await this._ready;
        while (this.available > 0) {
            const conn = await this._availableConnections.pop();
            await conn.end();
        }
    }
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/postgres/pool.ts.js.map