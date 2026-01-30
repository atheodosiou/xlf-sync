import { describe, it, expect } from "vitest";
import { writeV12 } from "../src/core/xlf/write-v12.js";
import { parseXlf } from "../src/core/xlf/index.js";
import type { MessageEntry } from "../src/types/model.js";

describe("XLIFF 1.2 Serialization", () => {
    it("should serialize a simple XLIFF 1.2 file", () => {
        const entries = new Map<string, MessageEntry>([
            ["welcome", { key: "welcome", sourceXml: "Welcome", targetXml: "Willkommen" }],
        ]);

        const parsed = {
            version: "1.2" as const,
            locale: "de",
            entries,
            raw: {
                "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
                xliff: {
                    "@_version": "1.2",
                    "@_xmlns": "urn:oasis:names:tc:xliff:document:1.2",
                    file: {
                        "@_source-language": "en",
                        "@_target-language": "de",
                        "@_datatype": "plaintext",
                        body: {
                            "trans-unit": [],
                        },
                    },
                },
            },
        };

        const xml = writeV12(parsed.raw, entries, [], { newTarget: "todo", obsolete: "mark" });

        expect(xml).toContain('version="1.2"');
        expect(xml).toContain("<source>Welcome</source>");
        expect(xml).toContain("<target>Willkommen</target>");
    });

    it("should mark obsolete entries with comment", () => {
        const entries = new Map<string, MessageEntry>([
            ["current", { key: "current", sourceXml: "Current", targetXml: "Aktuell" }],
        ]);

        const obsolete = new Map<string, MessageEntry>([
            ["deprecated", { key: "deprecated", sourceXml: "Deprecated", targetXml: "Veraltet" }],
        ]);

        const parsed = {
            version: "1.2" as const,
            locale: "de",
            entries: new Map([...entries, ...obsolete]),
            raw: {
                "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
                xliff: {
                    "@_version": "1.2",
                    "@_xmlns": "urn:oasis:names:tc:xliff:document:1.2",
                    file: {
                        "@_source-language": "en",
                        "@_target-language": "de",
                        "@_datatype": "plaintext",
                        body: {
                            "trans-unit": [
                                { "@_id": "current", source: "Current", target: "Aktuell" },
                                { "@_id": "deprecated", source: "Deprecated", target: "Veraltet" }
                            ],
                        },
                    },
                },
            },
        };

        const xml = writeV12(parsed.raw, entries, Array.from(obsolete.keys()), { newTarget: "todo", obsolete: "mark" });

        expect(xml).toContain('state="obsolete"');
        expect(xml).toContain("Deprecated");
    });

    it("should roundtrip parse and serialize", () => {
        const originalXml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="es" datatype="plaintext">
    <body>
      <trans-unit id="hello">
        <source>Hello</source>
        <target>Hola</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

        const parsed = parseXlf(originalXml);
        const serialized = writeV12(parsed.raw, parsed.entries, [], { newTarget: "todo", obsolete: "mark" });

        const reparsed = parseXlf(serialized);

        expect(reparsed.entries.get("hello")?.sourceXml).toBe("Hello");
        expect(reparsed.entries.get("hello")?.targetXml).toBe("Hola");
    });
});
