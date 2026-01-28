import { ParsedXlf, MessageEntry } from "../types/model.js";

function normalizeText(v: any): string {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") {
        if (typeof v["#text"] === "string") return v["#text"];
        if (typeof v.text === "string") return v.text;
        if (Array.isArray(v)) return v.map(normalizeText).join("");
    }
    return "";
}

/**
 * Extracts obsolete entries from the *original parsed raw doc* and returns them as MessageEntry map.
 * Targets are prefixed with "__OBSOLETE__" so writers emit state="obsolete".
 */
export function buildGraveyardEntries(parsed: ParsedXlf, obsoleteKeys: string[]): Map<string, MessageEntry> {
    const out = new Map<string, MessageEntry>();

    if (obsoleteKeys.length === 0) return out;

    if (parsed.version === "1.2") {
        const body = parsed.raw?.xliff?.file?.body;
        const units: any[] = body?.["trans-unit"] ?? [];

        for (const key of obsoleteKeys) {
            const u = units.find((x) => x?.["@_id"] === key);
            if (!u) continue;

            const source = normalizeText(u.source);
            const target = normalizeText(u.target);

            out.set(key, {
                key,
                sourceXml: source,
                targetXml: `__OBSOLETE__${target}`,
            });
        }

        return out;
    }

    // 2.0
    const file = parsed.raw?.xliff?.file;
    const units: any[] = file?.unit ?? [];

    for (const key of obsoleteKeys) {
        const u = units.find((x) => x?.["@_id"] === key);
        if (!u) continue;

        const seg = u.segment ?? {};
        const source = normalizeText(seg.source);
        const target = normalizeText(seg.target);

        out.set(key, {
            key,
            sourceXml: source,
            targetXml: `__OBSOLETE__${target}`,
        });
    }

    return out;
}
