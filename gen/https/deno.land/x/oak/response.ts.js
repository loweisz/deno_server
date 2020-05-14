// Copyright 2018-2020 the oak authors. All rights reserved. MIT license.
import { contentType, Status } from "./deps.ts";
import { isHtml } from "./util.ts";
const BODY_TYPES = ["string", "number", "bigint", "boolean", "symbol"];
const encoder = new TextEncoder();
export class Response {
    constructor() {
        this.#writable = true;
        this.#getBody = () => {
            const typeofBody = typeof this.body;
            let result;
            this.#writable = false;
            if (BODY_TYPES.includes(typeofBody)) {
                const bodyText = String(this.body);
                result = encoder.encode(bodyText);
                this.type = this.type || (isHtml(bodyText) ? "html" : "text/plain");
            }
            else if (this.body instanceof Uint8Array) {
                result = this.body;
            }
            else if (typeofBody === "object" && this.body !== null) {
                result = encoder.encode(JSON.stringify(this.body));
                this.type = this.type || "json";
            }
            return result;
        };
        this.#setContentType = () => {
            if (this.type) {
                const contentTypeString = contentType(this.type);
                if (contentTypeString && !this.headers.has("Content-Type")) {
                    this.headers.append("Content-Type", contentTypeString);
                }
            }
        };
        /** Headers that will be returned in the response */
        this.headers = new Headers();
    }
    #writable;
    #getBody;
    #setContentType;
    get writable() {
        return this.#writable;
    }
    /** Take this response and convert it to the response used by the Deno net
     * server. */
    toServerResponse() {
        // Process the body
        const body = this.#getBody();
        // If there is a response type, set the content type header
        this.#setContentType();
        // If there is no body and no content type and no set length, then set the
        // content length to 0
        if (!(body ||
            this.headers.has("Content-Type") ||
            this.headers.has("Content-Length"))) {
            this.headers.append("Content-Length", "0");
        }
        return {
            status: this.status || (body ? Status.OK : Status.NotFound),
            body,
            headers: this.headers,
        };
    }
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/oak/response.ts.js.map