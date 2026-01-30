import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { countWords, calculateStats, performReport } from "../src/commands/report.js";
import { isUntranslated } from "../src/core/sync.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_DIR = join(process.cwd(), "test-temp-report");

describe("Report Logic", () => {
    describe("isUntranslated", () => {
        it("should return true for empty or undefined", () => {
            expect(isUntranslated(undefined)).toBe(true);
            expect(isUntranslated("")).toBe(true);
            expect(isUntranslated("   ")).toBe(true);
        });

        it("should return true for TODO", () => {
            expect(isUntranslated("TODO")).toBe(true);
            expect(isUntranslated("todo")).toBe(true);
            expect(isUntranslated("  todo  ")).toBe(true);
        });

        it("should return false for actual text", () => {
            expect(isUntranslated("Hello")).toBe(false);
            expect(isUntranslated("   Some translation   ")).toBe(false);
        });
    });

    describe("countWords", () => {
        it("should return 0 for empty or undefined", () => {
            expect(countWords(undefined)).toBe(0);
            expect(countWords("")).toBe(0);
            expect(countWords("   ")).toBe(0);
        });

        it("should count words correctly", () => {
            expect(countWords("Hello world")).toBe(2);
            expect(countWords("This is a long sentence")).toBe(5);
            expect(countWords("   multi   space   test   ")).toBe(3);
        });
    });

    describe("calculateStats", () => {
        it("should calculate stats correctly", () => {
            const entries = [
                { targetXml: "Translated 1" },
                { targetXml: "TODO" },
                { targetXml: "" },
                { targetXml: "Translated 2 with words" },
            ];

            const stats = calculateStats(entries);

            expect(stats.total).toBe(4);
            expect(stats.todo).toBe(2);
            expect(stats.done).toBe(2);
            expect(stats.coverage).toBe(50);
            expect(stats.words).toBe(2 + 4); // "Translated 1" (2) + "Translated 2 with words" (4)
        });

        it("should handle empty entries", () => {
            const stats = calculateStats([]);
            expect(stats.total).toBe(0);
            expect(stats.coverage).toBe(100);
        });
    });

    describe("performReport integration", () => {
        beforeEach(async () => {
            await mkdir(TEST_DIR, { recursive: true });
        });

        afterEach(async () => {
            await rm(TEST_DIR, { recursive: true, force: true });
        });

        it("should summarize multiple files", async () => {
            const f1 = join(TEST_DIR, "messages.el.xlf");
            const f2 = join(TEST_DIR, "messages.fr.xlf");

            const xml1 = `<xliff version="1.2"><file><body>
                <trans-unit id="1"><source>S</source><target>T</target></trans-unit>
            </body></file></xliff>`;
            const xml2 = `<xliff version="1.2"><file><body>
                <trans-unit id="1"><source>S</source><target>TODO</target></trans-unit>
            </body></file></xliff>`;

            await writeFile(f1, xml1);
            await writeFile(f2, xml2);

            const rows = await performReport({
                localeFiles: [
                    { locale: "el", filePath: f1 },
                    { locale: "fr", filePath: f2 },
                ]
            });

            expect(rows).toHaveLength(2);
            expect(rows.find(r => r.locale === "el")?.coverage).toBe(100);
            expect(rows.find(r => r.locale === "fr")?.coverage).toBe(0);
        });
    });
});
