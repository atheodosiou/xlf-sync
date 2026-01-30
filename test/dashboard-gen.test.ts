import { describe, it, expect } from "vitest";
import { generateDashboardHtml } from "../src/core/dashboard-gen.js";

describe("Dashboard Generator", () => {
    it("should generate HTML with stats and matrix data", () => {
        const data = {
            stats: [
                { locale: "el", version: "1.2", keys: 10, pending: 2, percentage: "80.0%", words: 100 },
                { locale: "de", version: "2.0", keys: 10, pending: 0, percentage: "100.0%", words: 120 }
            ],
            matrix: [
                { id: "key1", locales: { el: true, de: true } },
                { id: "key2", locales: { el: false, de: true } }
            ],
            locales: ["el", "de"]
        };
        const version = "1.2.0";

        const html = generateDashboardHtml(data, version);

        expect(html).toContain("<!DOCTYPE html>");
        expect(html).toContain("XLF-Sync");
        expect(html).toContain("V1.2.0");
        expect(html).toContain("el");
        expect(html).toContain("de");
        expect(html).toContain("key1");
        expect(html).toContain("key2");
        expect(html).toContain("80.0%");
        expect(html).toContain("100.0%");
    });

    it("should handle empty data gracefully", () => {
        const data = {
            stats: [],
            matrix: [],
            locales: []
        };
        const html = generateDashboardHtml(data, "1.0.0");
        expect(html).toContain("V1.0.0");
        expect(html).toContain("Translation Dashboard");
    });
});
