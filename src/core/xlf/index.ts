import { XMLParser } from "fast-xml-parser";
import { ParsedXlf, MessageEntry, WriteOptions } from "../../types/model.js";
import { parseV12 } from "./v12.js";
import { parseV20 } from "./v20.js";
import { writeV12 } from "./write-v12.js";
import { writeV20 } from "./write-v20.js";

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: false,
});

export function parseXlf(xml: string): ParsedXlf {
    const doc = parser.parse(xml);

    const xliff = doc?.xliff;
    if (!xliff) throw new Error("Invalid XLF: missing <xliff>");

    const version = xliff["@_version"];
    if (version === "1.2") return parseV12(doc);
    if (version === "2.0") return parseV20(doc);

    throw new Error(`Unsupported XLIFF version: ${version}`);
}

export function writeXlf(
    parsed: ParsedXlf,
    merged: Map<string, MessageEntry>,
    obsoleteKeys: string[],
    opts: WriteOptions
): string {
    if (parsed.version === "1.2") return writeV12(parsed.raw, merged, obsoleteKeys, opts);
    return writeV20(parsed.raw, merged, obsoleteKeys, opts);
}
