import { escapeXml } from "./write-v20.js";
import type { MessageEntry, WriteOptions } from "../../types/model.js";

function normalizeText(v: unknown): string {
	if (v == null) return "";
	if (typeof v === "string") return v;
	if (typeof v === "object") {
		const obj = v as Record<string, unknown>;
		if (typeof obj["#text"] === "string") return obj["#text"];
		if (typeof obj.text === "string") return obj.text;
		if (Array.isArray(v)) return v.map(normalizeText).join("");
	}
	return "";
}

// Helper to ensure an item is an array
function asArray<T>(v: T | T[] | undefined | null): T[] {
	if (v === undefined || v === null) return [];
	return Array.isArray(v) ? v : [v];
}

export function writeV12(
	rawDoc: unknown,
	merged: Map<string, MessageEntry>,
	obsoleteKeys: string[],
	opts: WriteOptions,
): string {
	const doc = rawDoc as Record<string, unknown>;
	const xliff = doc.xliff as Record<string, unknown>;
	const file = xliff.file as Record<string, unknown>;
	let body = file.body as Record<string, unknown> | undefined;

	if (!body) {
		body = {};
		file.body = body;
	}

	// rebuild trans-units from merged (source-of-truth order)
	const transUnits: Record<string, unknown>[] = [];

	for (const entry of merged.values()) {
		const tu: Record<string, unknown> = {
			"@_id": normalizeText(entry.key),
			source: normalizeText(entry.sourceXml),
		};

		// Attributes
		if (entry.attributes) {
			for (const [k, v] of Object.entries(entry.attributes)) {
				tu[k] = v;
			}
		}

		// Target
		if (entry.targetXml !== undefined) {
			tu.target = entry.targetXml;
		}

		// Notes
		if (entry.notes && entry.notes.length > 0) {
			tu.note = entry.notes.map((n) => {
				const noteObj: Record<string, unknown> = { "#text": n.content };
				if (n.from) noteObj["@_from"] = n.from;
				if (n.priority) noteObj["@_priority"] = n.priority;
				return noteObj;
			});
		}

		// Contexts
		if (entry.contexts && entry.contexts.length > 0) {
			tu["context-group"] = [
				{
					"@_purpose": "location",
					context: entry.contexts.map((c) => ({
						"@_context-type": c.type,
						"#text": c.content,
					})),
				},
			];
		}

		transUnits.push(tu);
	}

	// add obsolete keys if we are marking or graveyard is disabled
	if (opts.obsolete === "mark") {
		const originalUnits = asArray(body["trans-unit"]) as Record<string, unknown>[];
		for (const key of obsoleteKeys) {
			const original = originalUnits.find((u) => u["@_id"] === key);
			if (!original) continue;

			const marked = { ...original };
			const oldTarget = (original.target as Record<string, unknown> | null)?.["#text"] ?? original.target;
			marked.target = `__OBSOLETE__${normalizeText(oldTarget)}`;
			transUnits.push(marked);
		}
	}

	body["trans-unit"] = transUnits;

	return toXmlV12(rawDoc);
}

/* =======================
   XML SERIALIZER (1.2)
   ======================= */

function toXmlV12(doc: unknown): string {
	const d = doc as Record<string, unknown>;
	const xliff = d.xliff as Record<string, unknown>;
	const file = xliff.file as Record<string, unknown>;
	const body = file.body as Record<string, unknown>;

	const headerAttrs = `version="${escapeXml(normalizeText(xliff["@_version"] ?? "1.2"))}"`;

	const fileAttrs: string[] = [];
	for (const [k, v] of Object.entries(file)) {
		if (k.startsWith("@_")) {
			fileAttrs.push(`${k.slice(2)}="${escapeXml(normalizeText(v))}"`);
		}
	}

	const units = asArray(body["trans-unit"]) as Record<string, unknown>[];

	const unitsXml = units
		.map((tu) => {
			const tuId = normalizeText(tu["@_id"]);
			const id = escapeXml(tuId);
			const source = escapeXml(normalizeText(tu.source));

			// Attributes
			let attrs = "";
			for (const [k, v] of Object.entries(tu)) {
				if (k.startsWith("@_") && k !== "@_id") {
					attrs += ` ${k.slice(2)}="${escapeXml(normalizeText(v))}"`;
				}
			}

			let unitBody = `      <trans-unit id="${id}"${attrs}>\n`;
			unitBody += `        <source>${source}</source>\n`;

			// Target & State
			let target = normalizeText(tu.target);
			let state = "";

			if (target.startsWith("__OBSOLETE__")) {
				target = target.replace("__OBSOLETE__", "");
				state = ' state="obsolete"';
			}

			if (tu.target !== undefined && tu.target !== null) {
				unitBody += `        <target${state}>${escapeXml(target)}</target>\n`;
			}

			// Notes
			const notes = asArray(tu.note) as Record<string, unknown>[];
			for (const n of notes) {
				let noteAttrs = "";
				if (n["@_from"]) noteAttrs += ` from="${escapeXml(normalizeText(n["@_from"]))}"`;
				if (n["@_priority"]) noteAttrs += ` priority="${escapeXml(normalizeText(n["@_priority"]))}"`;
				unitBody += `        <note${noteAttrs}>${escapeXml(normalizeText(n))}</note>\n`;
			}

			// Context groups (preservation)
			const contexts = asArray(tu["context-group"]) as Record<string, unknown>[];
			for (const cg of contexts) {
				const purpose = cg["@_purpose"] ? ` purpose="${escapeXml(normalizeText(cg["@_purpose"]))}"` : "";
				unitBody += `        <context-group${purpose}>\n`;
				const ctxs = asArray(cg.context) as Record<string, unknown>[];
				for (const ctx of ctxs) {
					const type = ctx["@_context-type"] ? ` context-type="${escapeXml(normalizeText(ctx["@_context-type"]))}"` : "";
					unitBody += `          <context${type}>${escapeXml(normalizeText(ctx))}</context>\n`;
				}
				unitBody += "        </context-group>\n";
			}

			unitBody += "      </trans-unit>";
			return unitBody;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8" ?>
<xliff ${headerAttrs} xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file ${fileAttrs.join(" ")}>\n    <body>\n${unitsXml}\n    </body>\n  </file>
</xliff>`;
}
