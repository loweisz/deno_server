import { deferred } from "./deps.ts";
export class DeferredStack {
    constructor(max, ls, _creator) {
        this._creator = _creator;
        this._maxSize = max || 10;
        this._array = ls ? [...ls] : [];
        this._size = this._array.length;
        this._queue = [];
    }
    async pop() {
        if (this._array.length > 0) {
            return this._array.pop();
        }
        else if (this._size < this._maxSize && this._creator) {
            this._size++;
            return await this._creator();
        }
        const d = deferred();
        this._queue.push(d);
        await d;
        return this._array.pop();
    }
    push(value) {
        this._array.push(value);
        if (this._queue.length > 0) {
            const d = this._queue.shift();
            d.resolve();
        }
    }
    get size() {
        return this._size;
    }
    get available() {
        return this._array.length;
    }
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/postgres/deferred.ts.js.map