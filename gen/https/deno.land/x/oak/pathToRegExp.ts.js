/*!
 * Adapted from path-to-regexp at https://github.com/pillarjs/path-to-regexp
 * which is licensed as:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Blake Embrey (hello@blakeembrey.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
const DEFAULT_DELIMITER = "/";
const DEFAULT_DELIMITERS = "./";
const PATH_REGEXP = new RegExp([
    "(\\\\.)",
    "(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?",
].join("|"), "g");
function escapeGroup(group) {
    return group.replace(/([=!:$/()])/g, "\\$1");
}
function escapeString(str) {
    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
export function parse(str, options) {
    const tokens = [];
    let key = 0;
    let index = 0;
    let path = "";
    const defaultDelimiter = (options && options.delimiter) || DEFAULT_DELIMITER;
    const delimiters = (options && options.delimiters) || DEFAULT_DELIMITERS;
    let pathEscaped = false;
    let res;
    while ((res = PATH_REGEXP.exec(str)) !== null) {
        const [m, escaped] = res;
        const offset = res.index;
        path += str.slice(index, offset);
        index = offset + m.length;
        if (escaped) {
            path += escaped[1];
            pathEscaped = true;
            continue;
        }
        let prev = "";
        const next = str[index];
        const [, , name, capture, group, modifier] = res;
        if (!pathEscaped && path.length) {
            const k = path.length - 1;
            if (delimiters.indexOf(path[k]) > -1) {
                prev = path[k];
                path = path.slice(0, k);
            }
        }
        if (path) {
            tokens.push(path);
            path = "";
            pathEscaped = false;
        }
        const partial = prev !== "" && next !== undefined && next !== prev;
        const repeat = modifier === "+" || modifier === "*";
        const optional = modifier === "?" || modifier === "*";
        const delimiter = prev || defaultDelimiter;
        const pattern = capture || group;
        tokens.push({
            name: name || key++,
            prefix: prev,
            delimiter,
            optional,
            repeat,
            partial,
            pattern: pattern
                ? escapeGroup(pattern)
                : `[^${escapeString(delimiter)}]+?`,
        });
    }
    if (path || index < str.length) {
        tokens.push(path + str.substr(index));
    }
    return tokens;
}
function flags(options) {
    return options && options.sensitive ? "" : "i";
}
function arrayToRegExp(path, keys, options) {
    const parts = [];
    for (const p of path) {
        parts.push(pathToRegExp(p, keys, options).source);
    }
    return new RegExp(`(?:${parts.join("|")})`, flags(options));
}
function regExpToRegExp(path, keys) {
    if (keys) {
        const groups = path.source.match(/\((?!\?)/g);
        if (groups) {
            for (let i = 0; i < groups.length; i++) {
                keys.push({
                    name: i,
                    prefix: null,
                    delimiter: null,
                    optional: false,
                    repeat: false,
                    partial: false,
                    pattern: null,
                });
            }
        }
    }
    return path;
}
function tokensToRegExp(tokens, keys, options = {}) {
    const { strict = false, start = true, end = true } = options;
    const delimiter = escapeString(options.delimiter || DEFAULT_DELIMITER);
    const delimiters = options.delimiters || DEFAULT_DELIMITERS;
    const endsWith = []
        .concat(options.endsWith || [])
        .map(escapeString)
        .concat("$")
        .join("|");
    let route = start ? "^" : "";
    let isEndDelimited = tokens.length === 0;
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (typeof token === "string") {
            route += escapeString(token);
            isEndDelimited = i === tokens.length - 1 &&
                delimiters.includes(token[token.length - 1]);
        }
        else {
            const capture = token.repeat
                ? `(?:${token.pattern})(?:${escapeString(token.delimiter || "")}(?:${token.pattern}))*`
                : token.pattern;
            if (keys) {
                keys.push(token);
            }
            if (token.optional) {
                if (token.partial) {
                    route += `${escapeString(token.prefix || "")}(${capture})?`;
                }
                else {
                    route += `(?:${escapeString(token.prefix || "")}(${capture}))?`;
                }
            }
            else {
                route += `${escapeString(token.prefix || "")}(${capture})`;
            }
        }
    }
    if (end) {
        if (!strict) {
            route += `(?:${delimiter})?`;
        }
        route += endsWith === "$" ? "$" : `(?=${endsWith})`;
    }
    else {
        if (!strict) {
            route += `(?:${delimiter}(?=${endsWith}))?`;
        }
        if (!isEndDelimited) {
            route += `(?=${delimiter}|${endsWith})`;
        }
    }
    return new RegExp(route, flags(options));
}
function stringToRegExp(path, keys, options) {
    return tokensToRegExp(parse(path, options), keys, options);
}
/** Take a path, with supported tokens, and generate a regular expression which
 * will match and parse out the tokens.
 */
export function pathToRegExp(path, keys, options) {
    if (path instanceof RegExp) {
        return regExpToRegExp(path, keys);
    }
    if (Array.isArray(path)) {
        return arrayToRegExp(path, keys, options);
    }
    return stringToRegExp(path, keys, options);
}
//# sourceMappingURL=file:///deno-dir/gen/https/deno.land/x/oak/pathToRegExp.ts.js.map