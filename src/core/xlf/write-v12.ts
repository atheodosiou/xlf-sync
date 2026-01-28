import { MessageEntry, WriteOptions } from "../../types/model.js";

export function writeV12(
    rawDoc: any,
    merged: Map<string, MessageEntry>,
    obsoleteKeys: string[],
    opts: WriteOptions
): string {
    const xliff = rawDoc.xliff;
    const file = xliff.file;
    const body = file.body;

    // rebuild trans-units
    const transUnits: any[] = [];
    for (const entry of merged.values()) {
        const tu: any = {
            "@_id": entry.key,
            source: entry.sourceXml ?? "",
        };
        if (entry.targetXml !== undefined) tu.target = entry.targetXml;
        transUnits.push(tu);
    }

    // obsolete handling (MVP)
    if (opts.obsolete === "mark") {
        for (const key of obsoleteKeys) {
            transUnits.push({
                "@_id": key,
                source: "[OBSOLETE]",
                target: "[OBSOLETE]",
                note: "Marked obsolete by xlf-sync",
            });
        }
    }
    // delete: do nothing (they're not included)
    // graveyard: handled outside (later step)

    body["trans-unit"] = transUnits;

    return toXmlV12(rawDoc);
}

// Super-simple XML builder for our limited structure (MVP).
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

    const headerAttrs = `version="${escapeXml(xliff["@_version"] ?? "1.2")}"`;
    const fileAttrs: string[] = [];
    for (const [k, v] of Object.entries(file)) {
        if (k.startsWith("@_")) {
            fileAttrs.push(`${k.slice(2)}="${escapeXml(String(v))}"`);
        }
    }

    const units = Array.isArray(body["trans-unit"]) ? body["trans-unit"] : [];
    const unitsXml = units
        .map((tu: any) => {
            const id = escapeXml(String(tu["@_id"]));
            const source = escapeXml(String(tu.source ?? ""));
            const target = tu.target !== undefined ? `<target>${escapeXml(String(tu.target))}</target>` : "";
            return `      <trans-unit id="${id}">\n        <source>${source}</source>\n        ${target}\n      </trans-unit>`;
        })
        .join("\n\n");

    return `<?xml version="1.0" encoding="UTF-8" ?>\n<xliff ${headerAttrs}>\n  <file ${fileAttrs.join(" ")}>\n    <body>\n${unitsXml}\n    </body>\n  </file>\n</xliff>\n`;
}
