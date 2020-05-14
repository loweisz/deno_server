import { Sha1Hash } from "./sha1.ts";
import { Md5Hash } from "./md5.ts";
export function hex(bytes) {
    return Array.prototype.map
        .call(bytes, (x) => x.toString(16).padStart(2, "0"))
        .join("");
}
export class Hash {
    constructor(algorithm) {
        this.algorithm = algorithm;
        const algorithms = {
            sha1: Sha1Hash,
            md5: Md5Hash
        };
        this.instance = new algorithms[algorithm]();
    }
    digest(bytes) {
        bytes = this.instance.digest(bytes);
        return {
            data: bytes,
            hex: () => hex(bytes),
        };
    }
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/checksum@1.2.0/hash.ts.js.map