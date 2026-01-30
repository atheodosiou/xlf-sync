import { describe, it, expect } from "vitest";
import { parseXlf } from "../src/core/xlf/index.js";

describe("XLF Main Index", () => {
    it("should throw error for invalid XLIFF (missing root)", () => {
        expect(() => parseXlf("<root></root>")).toThrow("Invalid XLF: missing <xliff>");
    });

    it("should throw error for unsupported version", () => {
        const xml = '<?xml version="1.0"?><xliff version="3.0"></xliff>';
        expect(() => parseXlf(xml)).toThrow("Unsupported XLIFF version: 3.0");
    });
});
