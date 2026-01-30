import { describe, it, expect } from "vitest";
import { buildGraveyardEntries } from "../src/core/graveyard.js";
import { ParsedXlf } from "../src/types/model.js";

describe("Graveyard Logic", () => {
    it("should return empty map for no obsolete keys", () => {
        const parsed: any = { version: "1.2" };
        const result = buildGraveyardEntries(parsed, []);
        expect(result.size).toBe(0);
    });

    it("should build graveyard entries for XLIFF 1.2", () => {
        const parsed: any = {
            version: "1.2",
            raw: {
                xliff: {
                    file: {
                        body: {
                            "trans-unit": [
                                { "@_id": "key1", source: "S1", target: "T1" },
                                { "@_id": "key2", source: "S2", target: "T2" },
                            ],
                        },
                    },
                },
            },
        };

        const result = buildGraveyardEntries(parsed, ["key1"]);
        expect(result.size).toBe(1);
        const entry = result.get("key1");
        expect(entry?.sourceXml).toBe("S1");
        expect(entry?.targetXml).toBe("__OBSOLETE__T1");
    });

    it("should build graveyard entries for XLIFF 2.0", () => {
        const parsed: any = {
            version: "2.0",
            raw: {
                xliff: {
                    file: {
                        unit: [
                            { "@_id": "k1", segment: { source: "S1", target: "T1" } },
                        ],
                    },
                },
            },
        };

        const result = buildGraveyardEntries(parsed, ["k1"]);
        expect(result.get("k1")?.targetXml).toBe("__OBSOLETE__T1");
    });

    it("should handle missing units gracefully", () => {
        const parsed: any = { version: "1.2", raw: { xliff: { file: { body: {} } } } };
        const result = buildGraveyardEntries(parsed, ["missing"]);
        expect(result.size).toBe(0);
    });

    it("should handle object-style text in units", () => {
        const parsed: any = {
            version: "1.2",
            raw: {
                xliff: {
                    file: {
                        body: {
                            "trans-unit": [
                                { "@_id": "k1", source: { "#text": "Source Text" }, target: "Target Text" },
                                { "@_id": "k2", source: { "text": "Another Source" }, target: "Another Target" },
                                { "@_id": "k3", source: ["Part1", "Part2"], target: "Full" },
                            ],
                        },
                    },
                },
            },
        };

        const result = buildGraveyardEntries(parsed, ["k1", "k2", "k3"]);
        expect(result.get("k1")?.sourceXml).toBe("Source Text");
        expect(result.get("k2")?.sourceXml).toBe("Another Source");
        expect(result.get("k3")?.sourceXml).toBe("Part1Part2");
    });
});
