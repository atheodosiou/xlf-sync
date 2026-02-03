import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import ora from "ora";
import { loadConfig } from "../core/config.js";
import { discoverFiles } from "../core/discover.js";
import { isUntranslated } from "../core/sync.js";
import { parseXlf } from "../core/xlf/index.js";
import type { MessageEntry } from "../types/model.js";
import { renderBanner } from "../ui/banner.js";
import { ui } from "../ui/console.js";
import type { ReportRow } from "../ui/table.js";
import { renderReportTable } from "../ui/table.js";

export function countWords(text: string | undefined): number {
	if (!text) return 0;
	return text
		.trim()
		.split(/\s+/)
		.filter((w) => w.length > 0).length;
}

export interface LocaleStats {
	total: number;
	done: number;
	todo: number;
	coverage: number;
	words: number;
}

export function calculateStats(
	sourceKeys: string[],
	localeEntries: Map<string, MessageEntry>,
): LocaleStats {
	let done = 0;
	let todo = 0;
	let words = 0;

	for (const key of sourceKeys) {
		const entry = localeEntries.get(key);
		if (!entry || isUntranslated(entry.targetXml)) {
			todo++;
		} else {
			done++;
			words += countWords(entry.targetXml);
		}
	}

	const total = sourceKeys.length;
	const coverage = total > 0 ? (done / total) * 100 : 100;

	return { total, done, todo, coverage, words };
}

export async function performReport(
	res: { localeFiles: { locale: string; filePath: string }[] },
	sourceKeys: string[],
): Promise<ReportRow[]> {
	const rows: ReportRow[] = [];

	for (const lf of res.localeFiles) {
		const xml = await readFile(lf.filePath, "utf-8");
		const parsed = parseXlf(xml);
		const stats = calculateStats(sourceKeys, parsed.entries);

		rows.push({
			locale: lf.locale,
			version: parsed.version,
			...stats,
		});
	}

	return rows;
}

export function registerReportCommand(program: Command) {
	program
		.command("report")
		.description("Generate translation statistics report")
		.option(
			"--source <path>",
			"Path to source messages.xlf",
			"src/locale/messages.xlf",
		)
		.option(
			"--locales <glob>",
			"Glob for locale files",
			"src/locale/messages.*.xlf",
		)
		.action(async (opts, cmd) => {
			renderBanner("report");

			const config = await loadConfig();

			const finalOpts = {
				source:
					cmd.getOptionValueSource("source") === "cli"
						? opts.source
						: (config.source ?? opts.source),
				locales:
					cmd.getOptionValueSource("locales") === "cli"
						? opts.locales
						: (config.locales ?? opts.locales),
			};

			const spinner = ora("Scanning files...").start();

			try {
				const res = await discoverFiles({
					sourcePath: finalOpts.source,
					localesGlob: finalOpts.locales,
				});

				const sourceXml = await readFile(finalOpts.source, "utf-8");
				const sourceParsed = parseXlf(sourceXml);
				const sourceKeys = Array.from(sourceParsed.entries.keys());

				const rows = await performReport(res, sourceKeys);

				spinner.stop();

				if (rows.length === 0) {
					ui.warn("No locale files found.");
				} else {
					renderReportTable(rows);
				}
			} catch (e: unknown) {
				spinner.fail("Failed");
				const err = e as Error;
				ui.error(err?.message ?? String(e));
				process.exitCode = 1;
			}
		});
}
