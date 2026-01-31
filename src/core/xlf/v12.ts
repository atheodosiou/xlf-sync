import { ParsedXlf, MessageEntry } from "../../types/model.js";

function asArray<T>(v: T | T[] | undefined | null): T[] {
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
}

export function parseV12(doc: any): ParsedXlf {
    const entries = new Map<string, MessageEntry>();

    const xliff = doc.xliff;
    const file = xliff.file;
    const locale = file?.["@_target-language"]; // optional

    const body = file?.body;
    if (!body) throw new Error("Invalid XLF 1.2: missing <body>");

    const transUnits = asArray(body["trans-unit"]);
    for (const tu of transUnits) {
        const id = tu?.["@_id"];
        if (!id) continue;

        const source = tu.source ?? "";
        const target = tu.target;

        // Custom attributes (preserve anything starting with @_)
        const attributes: Record<string, string> = {};
        for (const [k, v] of Object.entries(tu)) {
            if (k.startsWith("@_") && k !== "@_id") {
                attributes[k] = String(v);
            }
        }

        // Notes
        const notes = asArray(tu.note).map((n: any) => ({
            content: toXmlText(n),
            from: n?.["@_from"],
            priority: n?.["@_priority"],
        }));

        // Context Groups
        const contexts = asArray(tu["context-group"]).flatMap((cg: any) =>
            asArray(cg.context).map((c: any) => ({
                type: c?.["@_context-type"] ?? "",
                content: toXmlText(c),
            }))
        );

        entries.set(id, {
            key: id,
            sourceXml: toXmlText(source),
            targetXml: target !== undefined ? toXmlText(target) : undefined,
            attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
            notes: notes.length > 0 ? notes : undefined,
            contexts: contexts.length > 0 ? contexts : undefined,
        });
    }

    return {
        version: "1.2",
        locale,
        entries,
        raw: doc,
    };
}

// MVP: keep it simple (text-only). We'll upgrade later for inline tags.
function toXmlText(v: any): string {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") {
        if (typeof v["#text"] === "string") return v["#text"];
    }
    // fast-xml-parser can produce objects for mixed content; fallback:
    return String(v);
}
