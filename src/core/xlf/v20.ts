import { ParsedXlf, MessageEntry } from "../../types/model.js";

function asArray<T>(v: T | T[] | undefined | null): T[] {
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
}

export function parseV20(doc: any): ParsedXlf {
    const entries = new Map<string, MessageEntry>();

    const xliff = doc.xliff;
    const locale = xliff?.["@_trgLang"]; // optional

    const file = xliff.file;
    if (!file) throw new Error("Invalid XLF 2.0: missing <file>");

    const units = asArray(file.unit);
    for (const unit of units) {
        const unitId = unit?.["@_id"];
        if (!unitId) continue;

        const segments = asArray(unit.segment);
        // Angular exports usually have one segment, but support many
        segments.forEach((seg, idx) => {
            const source = seg?.source ?? "";
            const target = seg?.target;

            const key = segments.length > 1 ? `${unitId}:${idx}` : unitId;

            entries.set(key, {
                key,
                sourceXml: toXmlText(source),
                targetXml: target !== undefined ? toXmlText(target) : undefined,
            });
        });
    }

    return {
        version: "2.0",
        locale,
        entries,
        raw: doc,
    };
}

function toXmlText(v: any): string {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") {
        if (typeof v["#text"] === "string") return v["#text"];
        // fallback for other usage, though mostly #text is the key
    }
    return String(v);
}
