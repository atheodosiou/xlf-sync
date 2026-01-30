import { describe, it, expect } from "vitest";
import { isUntranslated, countWords, calculateStats } from "../src/commands/report.js";

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
});
