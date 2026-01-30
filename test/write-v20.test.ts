import { describe, it, expect } from "vitest";
import { writeV20 } from "../src/core/xlf/write-v20.js";
import { parseXlf } from "../src/core/xlf/index.js";
import type { MessageEntry } from "../src/types/model.js";

describe("XLIFF 2.0 Serialization", () => {
    it("should serialize a simple XLIFF 2.0 file", () => {
        const entries = new Map<string, MessageEntry>([
            ["test", { key: "test", sourceXml: "Hello", targetXml: "Hallo" }],
        ]);

        const parsed = {
            version: "2.0" as const,
            locale: "de",
            entries,
            raw: {
                "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
                xliff: {
                    "@_version": "2.0",
                    "@_xmlns": "urn:oasis:names:tc:xliff:document:2.0",
                    "@_srcLang": "en",
                    "@_trgLang": "de",
                    file: {
                        "@_id": "f1",
                        unit: [],
                    },
                },
            },
        };

        const xml = writeV20(parsed.raw, entries, [], { newTarget: "todo", obsolete: "mark" });

        expect(xml).toContain('version="2.0"');
        expect(xml).toContain("<source>Hello</source>");
        expect(xml).toContain("<target>Hallo</target>");
    });

    it("should mark obsolete entries", () => {
        const entries = new Map<string, MessageEntry>([
            ["active", { key: "active", sourceXml: "Active", targetXml: "Aktiv" }],
        ]);

        const obsolete = new Map<string, MessageEntry>([
            ["old", { key: "old", sourceXml: "Old", targetXml: "Alt" }],
        ]);

        const parsed = {
            version: "2.0" as const,
            locale: "de",
            entries: new Map([...entries, ...obsolete]),
            raw: {
                "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
                xliff: {
                    "@_version": "2.0",
                    "@_xmlns": "urn:oasis:names:tc:xliff:document:2.0",
                    "@_srcLang": "en",
                    "@_trgLang": "de",
                    file: {
                        "@_id": "f1",
                        unit: [
                            { "@_id": "active", segment: { source: "Active", target: "Aktiv" } },
                            { "@_id": "old", segment: { source: "Old", target: "Alt" } }
                        ],
                    },
                },
            },
        };

        const xml = writeV20(parsed.raw, entries, Array.from(obsolete.keys()), { newTarget: "todo", obsolete: "mark" });

        expect(xml).toContain('state="obsolete"');
        expect(xml).toContain("Old");
    });

    it("should roundtrip parse and serialize", () => {
        const originalXml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="fr">
  <file id="f1">
    <unit id="greeting">
      <segment>
        <source>Hello</source>
        <target>Bonjour</target>
      </segment>
    </unit>
  </file>
</xliff>`;

        const parsed = parseXlf(originalXml);
        const serialized = writeV20(parsed.raw, parsed.entries, [], { newTarget: "todo", obsolete: "mark" });

        const reparsed = parseXlf(serialized);

        expect(reparsed.entries.get("greeting")?.sourceXml).toBe("Hello");
        expect(reparsed.entries.get("greeting")?.targetXml).toBe("Bonjour");
    });
});
