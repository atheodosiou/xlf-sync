import { describe, it, expect } from "vitest";
import { resolveGraveyardPath } from "../src/commands/sync.js";

describe("Sync Command Utils", () => {
    describe("resolveGraveyardPath", () => {
        it("should replace {locale} placeholder", () => {
            const pattern = "path/to/backup.{locale}.xlf";
            expect(resolveGraveyardPath(pattern, "el")).toBe("path/to/backup.el.xlf");
            expect(resolveGraveyardPath(pattern, "en-US")).toBe("path/to/backup.en-US.xlf");
        });

        it("should handle multiple placeholders", () => {
            const pattern = "{locale}/messages.{locale}.xlf";
            expect(resolveGraveyardPath(pattern, "de")).toBe("de/messages.de.xlf");
        });
    });
});
