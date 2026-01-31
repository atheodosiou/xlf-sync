import { MessageEntry } from "../../types/model.js";

export type NewTargetMode = "todo" | "empty" | "source";
export type ObsoleteMode = "delete" | "mark" | "graveyard";

export interface WriteOptions {
    newTarget: NewTargetMode;
    obsolete: ObsoleteMode;
}

export function writeV20(
    rawDoc: any,
    merged: Map<string, MessageEntry>,
    obsoleteKeys: string[],
    opts: WriteOptions
): string {
    const xliff = rawDoc.xliff;
    const file = xliff.file;

    // Build units from merged (source-of-truth order)
    const units: any[] = [];

    for (const entry of merged.values()) {
        const unit: any = {
            "@_id": entry.key,
            segment: {
                source: entry.sourceXml ?? "",
            },
        };

        // Attributes (on unit)
        if (entry.attributes) {
            Object.assign(unit, entry.attributes);
        }

        // Notes (on unit)
        if (entry.notes && entry.notes.length > 0) {
            unit.notes = {
                note: entry.notes.map(n => {
                    const noteObj: any = { "#text": n.content };
                    if (n.category) noteObj["@_category"] = n.category;
                    if (n.id) noteObj["@_id"] = n.id;
                    if (n.priority) noteObj["@_priority"] = n.priority;
                    return noteObj;
                })
            };
        }

        if (entry.targetXml !== undefined) {
            unit.segment.target = entry.targetXml;
        }

        units.push(unit);
    }

    // OBSOLETE MARK (safe, string-only)
    if (opts.obsolete === "mark") {
        const originalUnits: any[] = Array.isArray(file.unit)
            ? file.unit
            : (file.unit ? [file.unit] : []);

        for (const key of obsoleteKeys) {
            const original = originalUnits.find((u) => u["@_id"] === key);
            if (!original) continue;

            const marked = { ...original };
            const seg = original.segment ? { ...original.segment } : {};

            const oldTarget = typeof seg.target === "object" ? seg.target["#text"] : seg.target;
            seg.target = `__OBSOLETE__${oldTarget ?? ""}`;
            marked.segment = seg;

            units.push(marked);
        }
    }

    // apply rebuilt units
    file.unit = units;

    return toXmlV20(rawDoc);
}

/* =======================
   XML SERIALIZER (2.0)
   ======================= */

function escapeXml(s: string) {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

function toXmlV20(doc: any): string {
    const xliff = doc.xliff;
    const file = xliff.file;

    const xliffAttrs: string[] = [];
    for (const [k, v] of Object.entries(xliff)) {
        if (k.startsWith("@_")) {
            xliffAttrs.push(`${k.slice(2)}="${escapeXml(String(v))}"`);
        }
    }

    const fileAttrs: string[] = [];
    for (const [k, v] of Object.entries(file)) {
        if (k.startsWith("@_")) {
            fileAttrs.push(`${k.slice(2)}="${escapeXml(String(v))}"`);
        }
    }

    const units: any[] = Array.isArray(file.unit) ? file.unit : [];

    const unitsXml = units
        .map((u) => {
            const id = escapeXml(String(u["@_id"]));

            // Attributes (excluding ID which is handled)
            let attrs = "";
            for (const [k, v] of Object.entries(u)) {
                if (k.startsWith("@_") && k !== "@_id") {
                    attrs += ` ${k.slice(2)}="${escapeXml(String(v))}"`;
                }
            }

            // Notes
            let notesXml = "";
            if (u.notes && u.notes.note) {
                const notes = Array.isArray(u.notes.note) ? u.notes.note : [u.notes.note];
                const noteLines = notes.map((n: any) => {
                    let nAttrs = "";
                    if (n["@_category"]) nAttrs += ` category="${escapeXml(String(n["@_category"]))}"`;
                    if (n["@_id"]) nAttrs += ` id="${escapeXml(String(n["@_id"]))}"`;
                    if (n["@_priority"]) nAttrs += ` priority="${escapeXml(String(n["@_priority"]))}"`;
                    return `        <note${nAttrs}>${escapeXml(String(n["#text"] ?? n))}</note>`;
                }).join("\n");
                notesXml = `      <notes>\n${noteLines}\n      </notes>\n`;
            }

            const seg = u.segment ?? {};
            const source = escapeXml(String(seg.source ?? ""));

            let targetXml = "";
            if (typeof seg.target === "string") {
                if (seg.target.startsWith("__OBSOLETE__")) {
                    const text = seg.target.replace("__OBSOLETE__", "");
                    targetXml = `<target state="obsolete">${escapeXml(text)}</target>`;
                } else {
                    targetXml = `<target>${escapeXml(seg.target)}</target>`;
                }
            }

            return (
                `    <unit id="${id}"${attrs}>\n` +
                (notesXml ? `${notesXml}` : "") +
                `      <segment>\n` +
                `        <source>${source}</source>\n` +
                (targetXml ? `        ${targetXml}\n` : "") +
                `      </segment>\n` +
                `    </unit>`
            );
        })
        .join("\n\n");

    return (
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<xliff ${xliffAttrs.join(" ")}>\n` +
        `  <file ${fileAttrs.join(" ")}>\n` +
        `${unitsXml}\n` +
        `  </file>\n` +
        `</xliff>\n`
    );
}
