import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_DIR = join(process.cwd(), "test-temp-config");

describe("Config Loading", () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it("should return empty object if no config exists", async () => {
        const config = await loadConfig(TEST_DIR);
        expect(config).toEqual({});
    });

    it("should load xlf-sync.json", async () => {
        const mockConfig = {
            source: "custom/messages.xlf",
            sync: { newTarget: "empty" }
        };
        await writeFile(join(TEST_DIR, "xlf-sync.json"), JSON.stringify(mockConfig));

        const config = await loadConfig(TEST_DIR);
        expect(config.source).toBe("custom/messages.xlf");
        expect(config.sync?.newTarget).toBe("empty");
    });

    it("should load xlf-sync.config.json if xlf-sync.json missing", async () => {
        const mockConfig = { source: "config-json/messages.xlf" };
        await writeFile(join(TEST_DIR, "xlf-sync.config.json"), JSON.stringify(mockConfig));

        const config = await loadConfig(TEST_DIR);
        expect(config.source).toBe("config-json/messages.xlf");
    });

    it("should prioritize xlf-sync.json over xlf-sync.config.json", async () => {
        await writeFile(join(TEST_DIR, "xlf-sync.json"), JSON.stringify({ source: "priority" }));
        await writeFile(join(TEST_DIR, "xlf-sync.config.json"), JSON.stringify({ source: "ignore" }));

        const config = await loadConfig(TEST_DIR);
        expect(config.source).toBe("priority");
    });
});
