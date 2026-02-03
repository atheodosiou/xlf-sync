import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverFiles } from "../src/core/discover.js";

describe("File Discovery", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(
			process.cwd(),
			`test-temp-${randomBytes(4).toString("hex")}`,
		);
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("should discover source and locale files", async () => {
		const sourcePath = join(testDir, "messages.xlf");
		const localeDe = join(testDir, "messages.de.xlf");
		const localeFr = join(testDir, "messages.fr.xlf");

		await writeFile(sourcePath, "<?xml version='1.0'?><xliff></xliff>");
		await writeFile(localeDe, "<?xml version='1.0'?><xliff></xliff>");
		await writeFile(localeFr, "<?xml version='1.0'?><xliff></xliff>");

		const result = await discoverFiles({
			sourcePath,
			localesGlob: join(testDir, "messages.*.xlf").replace(/\\/g, "/"),
		});

		expect(result.sourcePath).toBe(sourcePath);
		expect(result.localeFiles).toHaveLength(2);
		expect(result.localeFiles.map((f) => f.locale).sort()).toEqual([
			"de",
			"fr",
		]);
	});

	it("should extract locale from filename (simple)", async () => {
		const sourcePath = join(testDir, "messages.xlf");
		const localeEl = join(testDir, "messages.el.xlf");

		await writeFile(sourcePath, "<?xml version='1.0'?><xliff></xliff>");
		await writeFile(localeEl, "<?xml version='1.0'?><xliff></xliff>");

		const result = await discoverFiles({
			sourcePath,
			localesGlob: join(testDir, "messages.*.xlf").replace(/\\/g, "/"),
		});

		expect(result.localeFiles[0].locale).toBe("el");
	});

	it("should extract locale from filename (with region)", async () => {
		const sourcePath = join(testDir, "messages.xlf");
		const localeEnUs = join(testDir, "messages.en-US.xlf");

		await writeFile(sourcePath, "<?xml version='1.0'?><xliff></xliff>");
		await writeFile(localeEnUs, "<?xml version='1.0'?><xliff></xliff>");

		const result = await discoverFiles({
			sourcePath,
			localesGlob: join(testDir, "messages.*.xlf").replace(/\\/g, "/"),
		});

		expect(result.localeFiles[0].locale).toBe("en-US");
	});

	it("should throw error if source file does not exist", async () => {
		const sourcePath = join(testDir, "nonexistent.xlf");

		await expect(
			discoverFiles({
				sourcePath,
				localesGlob: join(testDir, "messages.*.xlf").replace(/\\/g, "/"),
			}),
		).rejects.toThrow();
	});

	it("should handle no locale files found", async () => {
		const sourcePath = join(testDir, "messages.xlf");

		await writeFile(sourcePath, "<?xml version='1.0'?><xliff></xliff>");

		const result = await discoverFiles({
			sourcePath,
			localesGlob: join(testDir, "messages.*.xlf").replace(/\\/g, "/"),
		});

		expect(result.localeFiles).toHaveLength(0);
	});

	it("should sort locale files alphabetically", async () => {
		const sourcePath = join(testDir, "messages.xlf");
		const localeZh = join(testDir, "messages.zh.xlf");
		const localeAr = join(testDir, "messages.ar.xlf");
		const localeFr = join(testDir, "messages.fr.xlf");

		await writeFile(sourcePath, "<?xml version='1.0'?><xliff></xliff>");
		await writeFile(localeZh, "<?xml version='1.0'?><xliff></xliff>");
		await writeFile(localeAr, "<?xml version='1.0'?><xliff></xliff>");
		await writeFile(localeFr, "<?xml version='1.0'?><xliff></xliff>");

		const result = await discoverFiles({
			sourcePath,
			localesGlob: join(testDir, "messages.*.xlf").replace(/\\/g, "/"),
		});

		expect(result.localeFiles.map((f) => f.locale)).toEqual(["ar", "fr", "zh"]);
	});

	it("should throw error if duplicate locales are found", async () => {
		const sourcePath = join(testDir, "messages.xlf");
		const locale1 = join(testDir, "messages.de.xlf");
		const subDir = join(testDir, "subdir");
		const locale2 = join(subDir, "messages.de.xlf");

		await writeFile(sourcePath, "<xliff/>");
		await writeFile(locale1, "<xliff/>");
		await mkdir(subDir);
		await writeFile(locale2, "<xliff/>");

		await expect(
			discoverFiles({
				sourcePath,
				localesGlob: join(testDir, "**/messages.*.xlf").replace(/\\/g, "/"),
			}),
		).rejects.toThrow('Duplicate locale "de"');
	});
});
