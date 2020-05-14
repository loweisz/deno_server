import { readInt16BE, readInt32BE } from "./utils.ts";
export class PacketReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.offset = 0;
        this.decoder = new TextDecoder();
    }
    readInt16() {
        const value = readInt16BE(this.buffer, this.offset);
        this.offset += 2;
        return value;
    }
    readInt32() {
        const value = readInt32BE(this.buffer, this.offset);
        this.offset += 4;
        return value;
    }
    readByte() {
        return this.readBytes(1)[0];
    }
    readBytes(length) {
        const start = this.offset;
        const end = start + length;
        const slice = this.buffer.slice(start, end);
        this.offset = end;
        return slice;
    }
    readString(length) {
        const bytes = this.readBytes(length);
        return this.decoder.decode(bytes);
    }
    readCString() {
        const start = this.offset;
        // find next null byte
        const end = this.buffer.indexOf(0, start);
        const slice = this.buffer.slice(start, end);
        // add +1 for null byte
        this.offset = end + 1;
        return this.decoder.decode(slice);
    }
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/postgres/packet_reader.ts.js.map