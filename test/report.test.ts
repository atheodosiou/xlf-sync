import { Command } from "commander";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedXlf, MessageEntry } from "../src/types/model.js";
import {
	calculateStats,
	countWords,
	performReport,
	registerReportCommand,
} from "../src/commands/report.js";
import * as config from "../src/core/config.js";
import * as discover from "../src/core/discover.js";
import { isUntranslated } from "../src/core/sync.js";
import * as xlfIndex from "../src/core/xlf/index.js";

const TEST_DIR = join(process.cwd(), "test-temp-report");

vi.mock("fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("fs/promises")>();
	return {
		...actual,
		readFile: vi.fn(),
	};
});

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
			const sourceKeys = ["id1", "id2", "id3", "id4"];
			const localeEntries = new Map([
				["id1", { key: "id1", sourceXml: "", targetXml: "Translated 1" }],
				["id2", { key: "id2", sourceXml: "", targetXml: "TODO" }],
				["id3", { key: "id3", sourceXml: "", targetXml: "" }],
				["id4", { key: "id4", sourceXml: "", targetXml: "Translated 2 with words" }],
			] as [string, MessageEntry][]);

			const stats = calculateStats(sourceKeys, localeEntries);

			expect(stats.total).toBe(4);
			expect(stats.todo).toBe(2);
			expect(stats.done).toBe(2);
			expect(stats.coverage).toBe(50);
			expect(stats.words).toBe(2 + 4); // "Translated 1" (2) + "Translated 2 with words" (4)
		});

		it("should handle empty entries", () => {
			const stats = calculateStats([], new Map());
			expect(stats.total).toBe(0);
			expect(stats.coverage).toBe(100);
		});
	});

	describe("performReport integration", () => {
		beforeEach(async () => {
			await mkdir(TEST_DIR, { recursive: true });
			vi.restoreAllMocks();
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

			// Mocking readFile to return our dummy XMLs instead of trying to read from disk if needed,
			// but performReport uses readFile internally. Let's redirect it.
			vi.mocked(readFile).mockImplementation(async (path: unknown) => {
				if (path === f1) return xml1;
				if (path === f2) return xml2;
				throw new Error("File not found");
			});

			// We must mock parseXlf because performReport calls it after readFile
			vi.mocked(xlfIndex.parseXlf).mockImplementation((xml) => {
				if (xml === xml1) {
					return {
						version: "1.2",
						entries: new Map([["1", { targetXml: "T" }]]),
						raw: {},
					} as unknown as ParsedXlf;
				}
				if (xml === xml2) {
					return {
						version: "1.2",
						entries: new Map([["1", { targetXml: "TODO" }]]),
						raw: {},
					} as unknown as ParsedXlf;
				}
				throw new Error("Parse error");
			});

			const sourceKeys = ["1"];

			const rows = await performReport(
				{
					localeFiles: [
						{ locale: "el", filePath: f1 },
						{ locale: "fr", filePath: f2 },
					],
				},
				sourceKeys,
			);

			expect(rows).toHaveLength(2);
			expect(rows.find((r) => r.locale === "el")?.coverage).toBe(100);
			expect(rows.find((r) => r.locale === "fr")?.coverage).toBe(0);
		});
	});

	describe("Report Command", () => {
		let program: Command;

		beforeEach(() => {
			program = new Command();
			registerReportCommand(program);
			vi.mock("../src/core/discover.js");
			vi.mock("../src/ui/banner.js");
			vi.mock("../src/core/config.js");
			vi.mock("../src/core/xlf/index.js");
			vi.mocked(readFile).mockResolvedValue("<xliff version='1.2'/>");
		});

		it("should call registerReportCommand and execute action", async () => {
			vi.mocked(config.loadConfig).mockResolvedValue({});
			vi.mocked(discover.discoverFiles).mockResolvedValue({
				localeFiles: [{ locale: "el", filePath: "dummy" }],
				sourcePath: "source",
			} as unknown as { localeFiles: { locale: string; filePath: string }[]; sourcePath: string });
			vi.mocked(xlfIndex.parseXlf).mockReturnValue({
				version: "1.2",
				entries: new Map([["1", { key: "1", sourceXml: "S" }]]),
				raw: {},
			});

			await program.parseAsync(["node", "test", "report"]);
			expect(discover.discoverFiles).toHaveBeenCalled();
		});

		it("should handle error in report command", async () => {
			vi.mocked(config.loadConfig).mockResolvedValue({});
			vi.mocked(discover.discoverFiles).mockRejectedValue(new Error("Fail"));

			await program.parseAsync(["node", "test", "report"]);
			expect(process.exitCode).toBe(1);
			process.exitCode = undefined;
		});
	});
});
