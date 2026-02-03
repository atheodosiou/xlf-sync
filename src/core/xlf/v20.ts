import type { MessageEntry, ParsedXlf } from "../../types/model.js";

function asArray<T>(v: T | T[] | undefined | null): T[] {
	if (!v) return [];
	return Array.isArray(v) ? v : [v];
}

export function parseV20(doc: unknown): ParsedXlf {
	const entries = new Map<string, MessageEntry>();
	const duplicates: string[] = [];

	const d = doc as { xliff: any };
	const xliff = d.xliff;
	const locale = xliff?.["@_trgLang"]; // optional

	const file = xliff.file;
	if (!file) throw new Error("Invalid XLF 2.0: missing <file>");

	const units = asArray(file.unit);
	for (const unit of units) {
		const unitId = unit?.["@_id"];
		if (!unitId) continue;

		if (entries.has(unitId)) {
			duplicates.push(unitId);
		}

		// Custom attributes
		const attributes: Record<string, string> = {};
		for (const [k, v] of Object.entries(unit)) {
			if (k.startsWith("@_") && k !== "@_id") {
				attributes[k] = String(v);
			}
		}

		// Notes
		const notesWrapper = unit.notes;
		const notes = notesWrapper
			? asArray(notesWrapper.note).map((n: Record<string, unknown>) => ({
				content: toXmlText(n),
				category: (n?.["@_category"] as string) ?? undefined,
				id: (n?.["@_id"] as string) ?? undefined,
				priority: (n?.["@_priority"] as string) ?? undefined,
			}))
			: [];

		const segments = asArray(unit.segment);
		// Angular exports usually have one segment, but support many
		segments.forEach((seg, idx) => {
			const source = seg?.source ?? "";
			const target = seg?.target;

			const key = segments.length > 1 ? `${unitId}:${idx}` : unitId;

			// Ideally we'd only attach notes to the first segment if we split,
			// but for safety/sync we attach to all derived entries.
			entries.set(key, {
				key,
				sourceXml: toXmlText(source),
				targetXml: target !== undefined ? toXmlText(target) : undefined,
				attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
				notes: notes.length > 0 ? notes : undefined,
			});
		});
	}

	return {
		version: "2.0",
		locale,
		entries,
		duplicates: duplicates.length > 0 ? duplicates : undefined,
		raw: doc,
	};
}

function toXmlText(v: unknown): string {
	if (v === null || v === undefined) return "";
	if (typeof v === "string") return v;
	if (typeof v === "number" || typeof v === "boolean") return String(v);

	if (typeof v === "object" && v !== null) {
		const obj = v as Record<string, unknown>;
		if (obj["#text"] !== undefined && obj["#text"] !== null) {
			return String(obj["#text"]);
		}
	}
	return String(v);
}
