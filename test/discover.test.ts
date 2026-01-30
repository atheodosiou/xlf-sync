import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { discoverFiles } from "../src/core/discover.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_DIR = join(process.cwd(), "test-temp");

describe("File Discovery", () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it("should discover source and locale files", async () => {
        const sourcePath = join(TEST_DIR, "messages.xlf");
        const localeDe = join(TEST_DIR, "messages.de.xlf");
        const localeFr = join(TEST_DIR, "messages.fr.xlf");

        await writeFile(sourcePath, "<?xml version='1.0'?><xliff></xliff>");
        await writeFile(localeDe, "<?xml version='1.0'?><xliff></xliff>");
        await writeFile(localeFr, "<?xml version='1.0'?><xliff></xliff>");

        const result = await discoverFiles({
            sourcePath,
            localesGlob: join(TEST_DIR, "messages.*.xlf").replace(/\\/g, "/"),
        });

        expect(result.sourcePath).toBe(sourcePath);
        expect(result.localeFiles).toHaveLength(2);
        expect(result.localeFiles.map(f => f.locale).sort()).toEqual(["de", "fr"]);
    });

    it("should extract locale from filename (simple)", async () => {
        const sourcePath = join(TEST_DIR, "messages.xlf");
        const localeEl = join(TEST_DIR, "messages.el.xlf");

        await writeFile(sourcePath, "<?xml version='1.0'?><xliff></xliff>");
        await writeFile(localeEl, "<?xml version='1.0'?><xliff></xliff>");

        const result = await discoverFiles({
            sourcePath,
            localesGlob: join(TEST_DIR, "messages.*.xlf").replace(/\\/g, "/"),
        });

        expect(result.localeFiles[0].locale).toBe("el");
    });

    it("should extract locale from filename (with region)", async () => {
        const sourcePath = join(TEST_DIR, "messages.xlf");
        const localeEnUs = join(TEST_DIR, "messages.en-US.xlf");

        await writeFile(sourcePath, "<?xml version='1.0'?><xliff></xliff>");
        await writeFile(localeEnUs, "<?xml version='1.0'?><xliff></xliff>");

        const result = await discoverFiles({
            sourcePath,
            localesGlob: join(TEST_DIR, "messages.*.xlf").replace(/\\/g, "/"),
        });

        expect(result.localeFiles[0].locale).toBe("en-US");
    });

    it("should throw error if source file does not exist", async () => {
        const sourcePath = join(TEST_DIR, "nonexistent.xlf");

        await expect(
            discoverFiles({
                sourcePath,
                localesGlob: join(TEST_DIR, "messages.*.xlf").replace(/\\/g, "/"),
            })
        ).rejects.toThrow();
    });

    it("should handle no locale files found", async () => {
        const sourcePath = join(TEST_DIR, "messages.xlf");

        await writeFile(sourcePath, "<?xml version='1.0'?><xliff></xliff>");

        const result = await discoverFiles({
            sourcePath,
            localesGlob: join(TEST_DIR, "messages.*.xlf").replace(/\\/g, "/"),
        });

        expect(result.localeFiles).toHaveLength(0);
    });

    it("should sort locale files alphabetically", async () => {
        const sourcePath = join(TEST_DIR, "messages.xlf");
        const localeZh = join(TEST_DIR, "messages.zh.xlf");
        const localeAr = join(TEST_DIR, "messages.ar.xlf");
        const localeFr = join(TEST_DIR, "messages.fr.xlf");

        await writeFile(sourcePath, "<?xml version='1.0'?><xliff></xliff>");
        await writeFile(localeZh, "<?xml version='1.0'?><xliff></xliff>");
        await writeFile(localeAr, "<?xml version='1.0'?><xliff></xliff>");
        await writeFile(localeFr, "<?xml version='1.0'?><xliff></xliff>");

        const result = await discoverFiles({
            sourcePath,
            localesGlob: join(TEST_DIR, "messages.*.xlf").replace(/\\/g, "/"),
        });

        expect(result.localeFiles.map(f => f.locale)).toEqual(["ar", "fr", "zh"]);
    });
});
