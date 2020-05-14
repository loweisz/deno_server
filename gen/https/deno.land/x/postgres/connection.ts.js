/*!
 * Substantial parts adapted from https://github.com/brianc/node-postgres
 * which is licensed as follows:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2010 - 2019 Brian Carlson
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { BufReader, BufWriter } from "./deps.ts";
import { PacketWriter } from "./packet_writer.ts";
import { hashMd5Password, readUInt32BE } from "./utils.ts";
import { PacketReader } from "./packet_reader.ts";
import { Query } from "./query.ts";
import { parseError } from "./error.ts";
export var Format;
(function (Format) {
    Format[Format["TEXT"] = 0] = "TEXT";
    Format[Format["BINARY"] = 1] = "BINARY";
})(Format || (Format = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["Idle"] = "I";
    TransactionStatus["IdleInTransaction"] = "T";
    TransactionStatus["InFailedTransaction"] = "E";
})(TransactionStatus || (TransactionStatus = {}));
export class Message {
    constructor(type, byteCount, body) {
        this.type = type;
        this.byteCount = byteCount;
        this.body = body;
        this.reader = new PacketReader(body);
    }
}
export class Column {
    constructor(name, tableOid, index, typeOid, columnLength, typeModifier, format) {
        this.name = name;
        this.tableOid = tableOid;
        this.index = index;
        this.typeOid = typeOid;
        this.columnLength = columnLength;
        this.typeModifier = typeModifier;
        this.format = format;
    }
}
export class RowDescription {
    constructor(columnCount, columns) {
        this.columnCount = columnCount;
        this.columns = columns;
    }
}
export class Connection {
    constructor(connParams) {
        this.connParams = connParams;
        this.decoder = new TextDecoder();
        this.encoder = new TextEncoder();
        this._parameters = {};
    }
    /** Read single message sent by backend */
    async readMessage() {
        // TODO: reuse buffer instead of allocating new ones each for each read
        const header = new Uint8Array(5);
        await this.bufReader.readFull(header);
        const msgType = this.decoder.decode(header.slice(0, 1));
        const msgLength = readUInt32BE(header, 1) - 4;
        const msgBody = new Uint8Array(msgLength);
        await this.bufReader.readFull(msgBody);
        return new Message(msgType, msgLength, msgBody);
    }
    async _sendStartupMessage() {
        const writer = this.packetWriter;
        writer.clear();
        // protocol version - 3.0, written as
        writer.addInt16(3).addInt16(0);
        const connParams = this.connParams;
        // TODO: recognize other parameters
        writer.addCString("user").addCString(connParams.user);
        writer.addCString("database").addCString(connParams.database);
        writer.addCString("application_name").addCString(connParams.applicationName);
        // eplicitly set utf-8 encoding
        writer.addCString("client_encoding").addCString("'utf-8'");
        // terminator after all parameters were writter
        writer.addCString("");
        const bodyBuffer = writer.flush();
        const bodyLength = bodyBuffer.length + 4;
        writer.clear();
        const finalBuffer = writer
            .addInt32(bodyLength)
            .add(bodyBuffer)
            .join();
        await this.bufWriter.write(finalBuffer);
    }
    async startup() {
        const { port, hostname } = this.connParams;
        this.conn = await Deno.connect({ port, hostname });
        this.bufReader = new BufReader(this.conn);
        this.bufWriter = new BufWriter(this.conn);
        this.packetWriter = new PacketWriter();
        await this._sendStartupMessage();
        await this.bufWriter.flush();
        let msg;
        msg = await this.readMessage();
        await this.handleAuth(msg);
        while (true) {
            msg = await this.readMessage();
            switch (msg.type) {
                // backend key data
                case "K":
                    this._processBackendKeyData(msg);
                    break;
                // parameter status
                case "S":
                    this._processParameterStatus(msg);
                    break;
                // ready for query
                case "Z":
                    this._processReadyForQuery(msg);
                    return;
                default:
                    throw new Error(`Unknown response for startup: ${msg.type}`);
            }
        }
    }
    async handleAuth(msg) {
        const code = msg.reader.readInt32();
        switch (code) {
            case 0:
                // pass
                break;
            case 3:
                // cleartext password
                await this._authCleartext();
                await this._readAuthResponse();
                break;
            case 5:
                // md5 password
                const salt = msg.reader.readBytes(4);
                await this._authMd5(salt);
                await this._readAuthResponse();
                break;
            default:
                throw new Error(`Unknown auth message code ${code}`);
        }
    }
    async _readAuthResponse() {
        const msg = await this.readMessage();
        if (msg.type === "E") {
            throw parseError(msg);
        }
        else if (msg.type !== "R") {
            throw new Error(`Unexpected auth response: ${msg.type}.`);
        }
        const responseCode = msg.reader.readInt32();
        if (responseCode !== 0) {
            throw new Error(`Unexpected auth response code: ${responseCode}.`);
        }
    }
    async _authCleartext() {
        this.packetWriter.clear();
        const password = this.connParams.password || "";
        const buffer = this.packetWriter.addCString(password).flush(0x70);
        await this.bufWriter.write(buffer);
        await this.bufWriter.flush();
    }
    async _authMd5(salt) {
        this.packetWriter.clear();
        if (!this.connParams.password) {
            throw new Error("Auth Error: attempting MD5 auth with password unset");
        }
        const password = hashMd5Password(this.connParams.password, this.connParams.user, salt);
        const buffer = this.packetWriter.addCString(password).flush(0x70);
        await this.bufWriter.write(buffer);
        await this.bufWriter.flush();
    }
    _processBackendKeyData(msg) {
        this._pid = msg.reader.readInt32();
        this._secretKey = msg.reader.readInt32();
    }
    _processParameterStatus(msg) {
        // TODO: should we save all parameters?
        const key = msg.reader.readCString();
        const value = msg.reader.readCString();
        this._parameters[key] = value;
    }
    _processReadyForQuery(msg) {
        const txStatus = msg.reader.readByte();
        this._transactionStatus = String.fromCharCode(txStatus);
    }
    async _readReadyForQuery() {
        const msg = await this.readMessage();
        if (msg.type !== "Z") {
            throw new Error(`Unexpected message type: ${msg.type}, expected "Z" (ReadyForQuery)`);
        }
        this._processReadyForQuery(msg);
    }
    async _simpleQuery(query) {
        this.packetWriter.clear();
        const buffer = this.packetWriter.addCString(query.text).flush(0x51);
        await this.bufWriter.write(buffer);
        await this.bufWriter.flush();
        const result = query.result;
        let msg;
        msg = await this.readMessage();
        switch (msg.type) {
            // row description
            case "T":
                result.handleRowDescription(this._processRowDescription(msg));
                break;
            // no data
            case "n":
                break;
            // error response
            case "E":
                await this._processError(msg);
                break;
            // notice response
            case "N":
                // TODO:
                console.log("TODO: handle notice");
                break;
            // command complete
            // TODO: this is duplicated in next loop
            case "C":
                result.done();
                break;
            default:
                throw new Error(`Unexpected frame: ${msg.type}`);
        }
        while (true) {
            msg = await this.readMessage();
            switch (msg.type) {
                // data row
                case "D":
                    // this is actually packet read
                    const foo = this._readDataRow(msg);
                    result.handleDataRow(foo);
                    break;
                // command complete
                case "C":
                    result.done();
                    break;
                // ready for query
                case "Z":
                    this._processReadyForQuery(msg);
                    return result;
                // error response
                case "E":
                    await this._processError(msg);
                    break;
                default:
                    throw new Error(`Unexpected frame: ${msg.type}`);
            }
        }
    }
    async _sendPrepareMessage(query) {
        this.packetWriter.clear();
        const buffer = this.packetWriter
            .addCString("") // TODO: handle named queries (config.name)
            .addCString(query.text)
            .addInt16(0)
            .flush(0x50);
        await this.bufWriter.write(buffer);
    }
    async _sendBindMessage(query) {
        this.packetWriter.clear();
        const hasBinaryArgs = query.args.reduce((prev, curr) => {
            return prev || curr instanceof Uint8Array;
        }, false);
        // bind statement
        this.packetWriter.clear();
        this.packetWriter
            .addCString("") // TODO: unnamed portal
            .addCString(""); // TODO: unnamed prepared statement
        if (hasBinaryArgs) {
            this.packetWriter.addInt16(query.args.length);
            query.args.forEach((arg) => {
                this.packetWriter.addInt16(arg instanceof Uint8Array ? 1 : 0);
            });
        }
        else {
            this.packetWriter.addInt16(0);
        }
        this.packetWriter.addInt16(query.args.length);
        query.args.forEach((arg) => {
            if (arg === null || typeof arg === "undefined") {
                this.packetWriter.addInt32(-1);
            }
            else if (arg instanceof Uint8Array) {
                this.packetWriter.addInt32(arg.length);
                this.packetWriter.add(arg);
            }
            else {
                const byteLength = this.encoder.encode(arg).length;
                this.packetWriter.addInt32(byteLength);
                this.packetWriter.addString(arg);
            }
        });
        this.packetWriter.addInt16(0);
        const buffer = this.packetWriter.flush(0x42);
        await this.bufWriter.write(buffer);
    }
    async _sendDescribeMessage() {
        this.packetWriter.clear();
        const buffer = this.packetWriter.addCString("P").flush(0x44);
        await this.bufWriter.write(buffer);
    }
    async _sendExecuteMessage() {
        this.packetWriter.clear();
        const buffer = this.packetWriter
            .addCString("") // unnamed portal
            .addInt32(0)
            .flush(0x45);
        await this.bufWriter.write(buffer);
    }
    async _sendFlushMessage() {
        this.packetWriter.clear();
        const buffer = this.packetWriter.flush(0x48);
        await this.bufWriter.write(buffer);
    }
    async _sendSyncMessage() {
        this.packetWriter.clear();
        const buffer = this.packetWriter.flush(0x53);
        await this.bufWriter.write(buffer);
    }
    async _processError(msg) {
        const error = parseError(msg);
        await this._readReadyForQuery();
        throw error;
    }
    async _readParseComplete() {
        const msg = await this.readMessage();
        switch (msg.type) {
            // parse completed
            case "1":
                // TODO: add to already parsed queries if
                // query has name, so it's not parsed again
                break;
            // error response
            case "E":
                await this._processError(msg);
                break;
            default:
                throw new Error(`Unexpected frame: ${msg.type}`);
        }
    }
    async _readBindComplete() {
        const msg = await this.readMessage();
        switch (msg.type) {
            // bind completed
            case "2":
                // no-op
                break;
            // error response
            case "E":
                await this._processError(msg);
                break;
            default:
                throw new Error(`Unexpected frame: ${msg.type}`);
        }
    }
    // TODO: I believe error handling here is not correct, shouldn't 'sync' message be
    //  sent after error response is received in prepared statements?
    async _preparedQuery(query) {
        await this._sendPrepareMessage(query);
        await this._sendBindMessage(query);
        await this._sendDescribeMessage();
        await this._sendExecuteMessage();
        await this._sendSyncMessage();
        // send all messages to backend
        await this.bufWriter.flush();
        await this._readParseComplete();
        await this._readBindComplete();
        const result = query.result;
        let msg;
        msg = await this.readMessage();
        switch (msg.type) {
            // row description
            case "T":
                const rowDescription = this._processRowDescription(msg);
                result.handleRowDescription(rowDescription);
                break;
            // no data
            case "n":
                break;
            // error
            case "E":
                await this._processError(msg);
                break;
            default:
                throw new Error(`Unexpected frame: ${msg.type}`);
        }
        outerLoop: while (true) {
            msg = await this.readMessage();
            switch (msg.type) {
                // data row
                case "D":
                    // this is actually packet read
                    const rawDataRow = this._readDataRow(msg);
                    result.handleDataRow(rawDataRow);
                    break;
                // command complete
                case "C":
                    result.done();
                    break outerLoop;
                // error response
                case "E":
                    await this._processError(msg);
                    break;
                default:
                    throw new Error(`Unexpected frame: ${msg.type}`);
            }
        }
        await this._readReadyForQuery();
        return result;
    }
    async query(query) {
        if (query.args.length === 0) {
            return await this._simpleQuery(query);
        }
        return await this._preparedQuery(query);
    }
    _processRowDescription(msg) {
        const columnCount = msg.reader.readInt16();
        const columns = [];
        for (let i = 0; i < columnCount; i++) {
            // TODO: if one of columns has 'format' == 'binary',
            //  all of them will be in same format?
            const column = new Column(msg.reader.readCString(), // name
            msg.reader.readInt32(), // tableOid
            msg.reader.readInt16(), // index
            msg.reader.readInt32(), // dataTypeOid
            msg.reader.readInt16(), // column
            msg.reader.readInt32(), // typeModifier
            msg.reader.readInt16());
            columns.push(column);
        }
        return new RowDescription(columnCount, columns);
    }
    _readDataRow(msg) {
        const fieldCount = msg.reader.readInt16();
        const row = [];
        for (let i = 0; i < fieldCount; i++) {
            const colLength = msg.reader.readInt32();
            if (colLength == -1) {
                row.push(null);
                continue;
            }
            // reading raw bytes here, they will be properly parsed later
            row.push(msg.reader.readBytes(colLength));
        }
        return row;
    }
    async initSQL() {
        const config = { text: "select 1;", args: [] };
        const query = new Query(config);
        await this.query(query);
    }
    async end() {
        const terminationMessage = new Uint8Array([0x58, 0x00, 0x00, 0x00, 0x04]);
        await this.bufWriter.write(terminationMessage);
        await this.bufWriter.flush();
        this.conn.close();
        delete this.conn;
        delete this.bufReader;
        delete this.bufWriter;
        delete this.packetWriter;
    }
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/postgres/connection.ts.js.map