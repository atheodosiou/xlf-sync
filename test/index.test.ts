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

    it("should roundtrip version 2.0", () => {
        const xml = '<?xml version="1.0"?><xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en"><file id="f1"><unit id="u1"><segment><source>S</source></segment></unit></file></xliff>';
        const parsed = parseXlf(xml);
        expect(parsed.version).toBe("2.0");
    });
});
