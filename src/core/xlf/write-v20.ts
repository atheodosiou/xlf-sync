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

        if (entry.targetXml !== undefined) {
            unit.segment.target = entry.targetXml;
        }

        units.push(unit);
    }

    // OBSOLETE MARK (safe, string-only)
    if (opts.obsolete === "mark") {
        const originalUnits: any[] = file.unit ?? [];

        for (const key of obsoleteKeys) {
            const original = originalUnits.find((u) => u["@_id"] === key);
            if (!original) continue;

            const seg = original.segment ?? {};

            units.push({
                "@_id": key,
                segment: {
                    source: seg.source ?? "",
                    target: `__OBSOLETE__${seg.target ?? ""}`,
                },
            });
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
                `    <unit id="${id}">\n` +
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
