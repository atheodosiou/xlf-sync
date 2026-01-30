import { describe, it, expect } from "vitest";
import { syncLocale } from "../src/core/sync.js";
import type { MessageEntry } from "../src/types/model.js";

describe("Sync Logic", () => {
    describe("Adding new keys", () => {
        it("should add new keys from source to locale", () => {
            const source = new Map<string, MessageEntry>([
                ["key1", { key: "key1", sourceXml: "Source 1" }],
                ["key2", { key: "key2", sourceXml: "Source 2" }],
            ]);

            const locale = new Map<string, MessageEntry>([
                ["key1", { key: "key1", sourceXml: "Source 1", targetXml: "Ziel 1" }],
            ]);

            const result = syncLocale(source, locale, {
                newTarget: "todo",
                obsolete: "mark",
            });

            expect(result.merged.size).toBe(2);
            expect(result.merged.get("key2")).toBeDefined();
            expect(result.merged.get("key2")?.targetXml).toBe("TODO");
            expect(result.addedKeys).toEqual(["key2"]);
        });

        it("should use 'empty' strategy for new targets", () => {
            const source = new Map<string, MessageEntry>([
                ["newkey", { key: "newkey", sourceXml: "New Source" }],
            ]);

            const locale = new Map<string, MessageEntry>();

            const result = syncLocale(source, locale, {
                newTarget: "empty",
                obsolete: "mark",
            });

            expect(result.merged.get("newkey")?.targetXml).toBe("");
        });

        it("should use 'source' strategy for new targets", () => {
            const source = new Map<string, MessageEntry>([
                ["newkey", { key: "newkey", sourceXml: "Copy Me" }],
            ]);

            const locale = new Map<string, MessageEntry>();

            const result = syncLocale(source, locale, {
                newTarget: "source",
                obsolete: "mark",
            });

            expect(result.merged.get("newkey")?.targetXml).toBe("Copy Me");
        });
    });

    describe("Preserving existing translations", () => {
        it("should never overwrite existing translations", () => {
            const source = new Map<string, MessageEntry>([
                ["key1", { key: "key1", sourceXml: "Updated Source" }],
            ]);

            const locale = new Map<string, MessageEntry>([
                ["key1", { key: "key1", sourceXml: "Old Source", targetXml: "Existing Translation" }],
            ]);

            const result = syncLocale(source, locale, {
                newTarget: "todo",
                obsolete: "mark",
            });

            expect(result.merged.get("key1")?.targetXml).toBe("Existing Translation");
        });
    });

    describe("Handling obsolete keys", () => {
        it("should detect obsolete keys", () => {
            const source = new Map<string, MessageEntry>([
                ["key1", { key: "key1", sourceXml: "Source 1" }],
            ]);

            const locale = new Map<string, MessageEntry>([
                ["key1", { key: "key1", sourceXml: "Source 1", targetXml: "Ziel 1" }],
                ["oldkey", { key: "oldkey", sourceXml: "Old Source", targetXml: "Old Translation" }],
            ]);

            const result = syncLocale(source, locale, {
                newTarget: "todo",
                obsolete: "mark",
            });

            expect(result.obsoleteKeys).toEqual(["oldkey"]);
        });
    });

    describe("Missing targets detection", () => {
        it("should detect keys with missing targets", () => {
            const source = new Map<string, MessageEntry>([
                ["key1", { key: "key1", sourceXml: "Source 1" }],
                ["key2", { key: "key2", sourceXml: "Source 2" }],
            ]);

            const locale = new Map<string, MessageEntry>([
                ["key1", { key: "key1", sourceXml: "Source 1", targetXml: "Ziel 1" }],
                ["key2", { key: "key2", sourceXml: "Source 2", targetXml: "" }],
            ]);

            const result = syncLocale(source, locale, {
                newTarget: "todo",
                obsolete: "mark",
            });

            expect(result.missingTargets).toContain("key2");
        });

        it("should not mark new keys with valid targets as missing", () => {
            const source = new Map<string, MessageEntry>([
                ["newkey", { key: "newkey", sourceXml: "New Source" }],
            ]);

            const locale = new Map<string, MessageEntry>();

            const result = syncLocale(source, locale, {
                newTarget: "source",
                obsolete: "mark",
            });

            expect(result.missingTargets).not.toContain("newkey");
        });
    });
});
