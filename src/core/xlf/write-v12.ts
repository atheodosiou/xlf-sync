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

        if (entry.targetXml !== undefined) {
            tu.target = normalizeText(entry.targetXml);
        }

        transUnits.push(tu);
    }

    // OBSOLETE MARK (safe, string-only, recovery-friendly)
    if (opts.obsolete === "mark") {
        const originalUnits: any[] = body["trans-unit"] ?? [];

        for (const key of obsoleteKeys) {
            const original = originalUnits.find((u) => u["@_id"] === key);
            if (!original) continue;

            transUnits.push({
                "@_id": normalizeText(key),
                source: normalizeText(original.source),
                target: `__OBSOLETE__${normalizeText(original.target)}`,
                note: "Marked obsolete by xlf-sync",
            });
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

            const noteXml = tu.note
                ? `<note>${escapeXml(normalizeText(tu.note))}</note>`
                : "";

            return (
                `      <trans-unit id="${id}">\n` +
                `        <source>${source}</source>\n` +
                (targetXml ? `        ${targetXml}\n` : "") +
                (noteXml ? `        ${noteXml}\n` : "") +
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
