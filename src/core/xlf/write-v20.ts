import { MessageEntry, WriteOptions } from "../../types/model.js";

export function writeV20(
    rawDoc: any,
    merged: Map<string, MessageEntry>,
    obsoleteKeys: string[],
    opts: WriteOptions
): string {
    const xliff = rawDoc.xliff;
    const file = xliff.file;

    const units: any[] = [];
    for (const entry of merged.values()) {
        const unit: any = {
            "@_id": entry.key,
            segment: {
                source: entry.sourceXml ?? "",
                ...(entry.targetXml !== undefined ? { target: entry.targetXml } : {}),
            },
        };
        units.push(unit);
    }

    if (opts.obsolete === "mark") {
        for (const key of obsoleteKeys) {
            units.push({
                "@_id": key,
                segment: { source: "[OBSOLETE]", target: "[OBSOLETE]" },
            });
        }
    }

    file.unit = units;

    return toXmlV20(rawDoc);
}

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
        if (k.startsWith("@_")) fileAttrs.push(`${k.slice(2)}="${escapeXml(String(v))}"`);
    }

    const units = Array.isArray(file.unit) ? file.unit : [];
    const unitsXml = units
        .map((u: any) => {
            const id = escapeXml(String(u["@_id"]));
            const seg = u.segment ?? {};
            const source = escapeXml(String(seg.source ?? ""));
            const target = seg.target !== undefined ? `<target>${escapeXml(String(seg.target))}</target>` : "";
            return `    <unit id="${id}">\n      <segment>\n        <source>${source}</source>\n        ${target}\n      </segment>\n    </unit>`;
        })
        .join("\n\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<xliff ${xliffAttrs.join(" ")}>\n  <file ${fileAttrs.join(" ")}>\n${unitsXml}\n  </file>\n</xliff>\n`;
}
