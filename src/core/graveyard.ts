import type { MessageEntry, ParsedXlf } from "../types/model.js";

function asArray<T>(v: T | T[] | undefined | null): T[] {
	if (v === undefined || v === null) return [];
	return Array.isArray(v) ? v : [v];
}

function normalizeText(v: unknown): string {
	if (v == null) return "";
	if (typeof v === "string") return v;
	if (typeof v === "object") {
		const obj = v as Record<string, unknown>;
		if (typeof obj["#text"] === "string") return obj["#text"];
		if (typeof obj.text === "string") return obj.text;
		if (Array.isArray(v)) return (v as unknown[]).map(normalizeText).join("");
	}
	return "";
}

/**
 * Extracts obsolete entries from the *original parsed raw doc* and returns them as MessageEntry map.
 * Targets are prefixed with "__OBSOLETE__" so writers emit state="obsolete".
 */
export function buildGraveyardEntries(
	parsed: ParsedXlf,
	obsoleteKeys: string[],
): Map<string, MessageEntry> {
	const out = new Map<string, MessageEntry>();

	if (obsoleteKeys.length === 0) return out;

	const raw = parsed.raw as Record<string, unknown>;

	if (parsed.version === "1.2") {
		const xliff = raw?.xliff as Record<string, unknown>;
		const file = xliff?.file as Record<string, unknown>;
		const body = file?.body as Record<string, unknown>;
		const units = asArray(body?.["trans-unit"]) as Record<string, unknown>[];

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
	} else {
		// 2.0
		const xliff = raw?.xliff as Record<string, unknown>;
		const file = xliff?.file as Record<string, unknown>;
		const units = asArray(file?.unit) as Record<string, unknown>[];

		for (const key of obsoleteKeys) {
			const u = units.find((x) => x?.["@_id"] === key);
			if (!u) continue;

			const seg = (u.segment as Record<string, unknown>) ?? {};
			const source = normalizeText(seg.source);
			const target = normalizeText(seg.target);

			out.set(key, {
				key,
				sourceXml: source,
				targetXml: `__OBSOLETE__${target}`,
			});
		}
	}

	return out;
}
