import { MessageEntry } from "../../types/model.js";

export type NewTargetMode = "todo" | "empty" | "source";
export type ObsoleteMode = "delete" | "mark" | "graveyard";

export interface WriteOptions {
    newTarget: NewTargetMode;
    obsolete: ObsoleteMode;
}

/**
 * Defensive normalization:
 * - Ensures we never stringify objects into "[object Object]"
 * - Helps recover from previously "dirty" files.
 */
function normalizeText(v: any): string {
    if (v == null) return "";
    if (typeof v === "string") return v;

    // If some upstream step accidentally produced a fast-xml-parser style object
    if (typeof v === "object") {
        if (typeof v["#text"] === "string") return v["#text"];
        if (typeof v.text === "string") return v.text;

        // Sometimes arrays happen in edge cases
        if (Array.isArray(v)) {
            return v.map(normalizeText).join("");
        }
    }

    return "";
}

export function writeV12(
    rawDoc: any,
    merged: Map<string, MessageEntry>,
    obsoleteKeys: string[],
    opts: WriteOptions
): string {
    const xliff = rawDoc.xliff;
    const file = xliff.file;
    const body = file.body;

    // rebuild trans-units from merged (source-of-truth order)
    const transUnits: any[] = [];

    for (const entry of merged.values()) {
        const tu: any = {
            "@_id": normalizeText(entry.key),
            source: normalizeText(entry.sourceXml),
        };

        // Attributes
        if (entry.attributes) {
            Object.assign(tu, entry.attributes);
        }

        if (entry.targetXml !== undefined) {
            tu.target = normalizeText(entry.targetXml);
        }

        // Context Groups (Angular default: purpose="location")
        if (entry.contexts && entry.contexts.length > 0) {
            tu["context-group"] = {
                "@_purpose": "location",
                context: entry.contexts.map(c => ({
                    "#text": normalizeText(c.content),
                    "@_context-type": c.type,
                })),
            };
        }

        // Notes
        if (entry.notes && entry.notes.length > 0) {
            tu.note = entry.notes.map(n => {
                const noteObj: any = { "#text": normalizeText(n.content) };
                if (n.from) noteObj["@_from"] = n.from;
                if (n.priority) noteObj["@_priority"] = n.priority;
                return noteObj;
            });
        }

        transUnits.push(tu);
    }

    // OBSOLETE MARK (safe, string-only, recovery-friendly)
    if (opts.obsolete === "mark") {
        const originalUnits: any[] = Array.isArray(body["trans-unit"])
            ? body["trans-unit"]
            : (body["trans-unit"] ? [body["trans-unit"]] : []);

        for (const key of obsoleteKeys) {
            const original = originalUnits.find((u) => u["@_id"] === key);
            if (!original) continue;

            const marked = { ...original };
            // Ensure target is a string for the special __OBSOLETE__ prefixing handled by toXmlV12
            const oldTarget = typeof original.target === "object" ? original.target["#text"] : original.target;
            marked.target = `__OBSOLETE__${normalizeText(oldTarget)}`;

            // We rely on toXmlV12 to serialize the rest (notes, attributes) from the raw object
            transUnits.push(marked);
        }
    }

    // apply rebuilt units
    body["trans-unit"] = transUnits;

    return toXmlV12(rawDoc);
}

/* =======================
   XML SERIALIZER (1.2)
   ======================= */

function escapeXml(s: string) {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

function toXmlV12(doc: any): string {
    const xliff = doc.xliff;
    const file = xliff.file;
    const body = file.body;

    const headerAttrs = `version="${escapeXml(normalizeText(xliff["@_version"] ?? "1.2"))}"`;

    const fileAttrs: string[] = [];
    for (const [k, v] of Object.entries(file)) {
        if (k.startsWith("@_")) {
            fileAttrs.push(`${k.slice(2)}="${escapeXml(normalizeText(v))}"`);
        }
    }

    const units: any[] = Array.isArray(body["trans-unit"])
        ? body["trans-unit"]
        : [];

    const unitsXml = units
        .map((tu) => {
            const id = escapeXml(normalizeText(tu["@_id"]));
            const source = escapeXml(normalizeText(tu.source));

            // Attributes
            let attrs = "";
            for (const [k, v] of Object.entries(tu)) {
                if (k.startsWith("@_") && k !== "@_id") {
                    attrs += ` ${k.slice(2)}="${escapeXml(normalizeText(v))}"`;
                }
            }

            let targetXml = "";
            const targetRaw = tu.target;

            if (typeof targetRaw === "string") {
                if (targetRaw.startsWith("__OBSOLETE__")) {
                    const text = targetRaw.replace("__OBSOLETE__", "");
                    targetXml = `<target state="obsolete">${escapeXml(normalizeText(text))}</target>`;
                } else {
                    targetXml = `<target>${escapeXml(normalizeText(targetRaw))}</target>`;
                }
            }

            // Context Groups
            let contextXml = "";
            if (tu["context-group"]) {
                const cg = tu["context-group"];
                const purpose = cg["@_purpose"] ? ` purpose="${escapeXml(cg["@_purpose"])}"` : "";
                const contexts = Array.isArray(cg.context) ? cg.context : [cg.context];
                const contextsStr = contexts.map((c: any) =>
                    `        <context context-type="${escapeXml(c["@_context-type"])}">${escapeXml(normalizeText(c["#text"]))}</context>`
                ).join("\n");
                contextXml = `        <context-group${purpose}>\n${contextsStr}\n        </context-group>`;
            }

            // Notes
            let noteXml = "";
            if (tu.note) {
                const notes = Array.isArray(tu.note) ? tu.note : [tu.note];
                noteXml = notes.map((n: any) => {
                    let nAttrs = "";
                    if (n["@_from"]) nAttrs += ` from="${escapeXml(n["@_from"])}"`;
                    if (n["@_priority"]) nAttrs += ` priority="${escapeXml(n["@_priority"])}"`;
                    return `        <note${nAttrs}>${escapeXml(normalizeText(n["#text"] ?? n))}</note>`;
                }).join("\n");
            }

            return (
                `      <trans-unit id="${id}"${attrs}>\n` +
                `        <source>${source}</source>\n` +
                (targetXml ? `        ${targetXml}\n` : "") +
                (contextXml ? `${contextXml}\n` : "") +
                (noteXml ? `${noteXml}\n` : "") +
                `      </trans-unit>`
            );
        })
        .join("\n\n");

    return (
        `<?xml version="1.0" encoding="UTF-8" ?>\n` +
        `<xliff ${headerAttrs}>\n` +
        `  <file ${fileAttrs.join(" ")}>\n` +
        `    <body>\n` +
        `${unitsXml}\n` +
        `    </body>\n` +
        `  </file>\n` +
        `</xliff>\n`
    );
}
