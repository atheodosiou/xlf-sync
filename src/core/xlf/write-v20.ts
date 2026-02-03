import type { MessageEntry } from "../../types/model.js";

export type NewTargetMode = "todo" | "empty" | "source";
export type ObsoleteMode = "delete" | "mark" | "graveyard";

export interface WriteOptions {
	newTarget: NewTargetMode;
	obsolete: ObsoleteMode;
}

// Helper to ensure a value is an array
function asArray<T>(value: T | T[] | undefined | null): T[] {
	if (value === undefined || value === null) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

export function writeV20(
	rawDoc: unknown,
	merged: Map<string, MessageEntry>,
	obsoleteKeys: string[],
	opts: { obsolete: ObsoleteMode }, // Corrected type based on WriteOptions, assuming only 'obsolete' is relevant here
): string {
	const doc = rawDoc as Record<string, unknown>;
	const xliff = doc.xliff as Record<string, unknown>;
	const file = xliff.file as Record<string, unknown>;

	// Build units from merged (source-of-truth order)
	const units: Record<string, unknown>[] = [];

	for (const entry of merged.values()) {
		const unit: Record<string, unknown> = {
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
				note: entry.notes.map((n) => {
					const noteObj: Record<string, unknown> = { "#text": n.content };
					if (n.category) noteObj["@_category"] = n.category;
					if (n.id) noteObj["@_id"] = n.id;
					if (n.priority) noteObj["@_priority"] = n.priority;
					return noteObj;
				}),
			};
		}

		if (entry.targetXml !== undefined) {
			(unit.segment as Record<string, unknown>).target = entry.targetXml;
		}

		units.push(unit);
	}

	// OBSOLETE MARK (safe, string-only)
	if (opts.obsolete === "mark") {
		const originalUnits: Record<string, unknown>[] = asArray(file.unit) as Record<string, unknown>[];

		for (const key of obsoleteKeys) {
			const original = originalUnits.find((u) => u["@_id"] === key);
			if (!original) continue;

			const marked = { ...original };
			const seg = (original.segment ? { ...(original.segment as Record<string, unknown>) } : {}) as Record<string, unknown>;

			const oldTarget =
				typeof seg.target === "object" ? (seg.target as Record<string, unknown>)["#text"] : seg.target;
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

export function escapeXml(s: string) {
	return s
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function toXmlV20(doc: unknown): string {
	const d = doc as Record<string, unknown>;
	const xliff = d.xliff as Record<string, unknown>;
	const file = xliff.file as Record<string, unknown>;

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

	const units = asArray(file.unit) as Record<string, unknown>[];

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
			if (u.notes) {
				const notes = asArray((u.notes as Record<string, unknown>).note) as Record<string, unknown>[];
				const noteLines = notes
					.map((n: Record<string, unknown>) => {
						let nAttrs = "";
						if (n["@_category"])
							nAttrs += ` category="${escapeXml(n["@_category"] as string)}"`;
						if (n["@_id"]) nAttrs += ` id="${escapeXml(n["@_id"] as string)}"`;
						if (n["@_priority"])
							nAttrs += ` priority="${escapeXml(n["@_priority"] as string)}"`;
						return `        <note${nAttrs}>${escapeXml(String(n["#text"] ?? n))}</note>`;
					})
					.join("\n");
				notesXml = `      <notes>\n${noteLines}\n      </notes>\n`;
			}

			const seg = (u.segment ?? {}) as Record<string, unknown>;
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
