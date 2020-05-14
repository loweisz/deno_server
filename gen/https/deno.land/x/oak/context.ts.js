// Copyright 2018-2020 the oak authors. All rights reserved. MIT license.
import { Cookies } from "./cookies.ts";
import { createHttpError } from "./httpError.ts";
import { Request } from "./request.ts";
import { Response } from "./response.ts";
export class Context {
    constructor(app, serverRequest) {
        /** The response object */
        this.response = new Response();
        this.app = app;
        this.state = app.state;
        this.request = new Request(serverRequest);
        this.cookies = new Cookies(this.request, this.response, {
            keys: this.app.keys,
            secure: this.request.secure,
        });
    }
    /** Asserts the condition and if the condition fails, creates an HTTP error
     * with the provided status (which defaults to `500`).  The error status by
     * default will be set on the `.response.status`.
     */
    assert(condition, errorStatus = 500, message, props) {
        if (condition) {
            return;
        }
        const err = createHttpError(errorStatus, message);
        if (props) {
            Object.assign(err, props);
        }
        throw err;
    }
    /** Create and throw an HTTP Error, which can be used to pass status
     * information which can be caught by other middleware to send more
     * meaningful error messages back to the client.  The passed error status will
     * be set on the `.response.status` by default as well.
     */
    throw(errorStatus, message, props) {
        const err = createHttpError(errorStatus, message);
        if (props) {
            Object.assign(err, props);
        }
        throw err;
    }
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/oak/context.ts.js.map