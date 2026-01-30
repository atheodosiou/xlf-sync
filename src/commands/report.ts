import { Command } from "commander";
import ora from "ora";
import { ui } from "../ui/console.js";
import { discoverFiles } from "../core/discover.js";
import { readFile } from "node:fs/promises";
import { parseXlf } from "../core/xlf/index.js";
import { renderReportTable, ReportRow } from "../ui/table.js";
import { renderBanner } from "../ui/banner.js";

export function isUntranslated(target: string | undefined): boolean {
    if (!target) return true;
    const t = target.trim();
    return t === "" || t.toUpperCase() === "TODO";
}

export function countWords(text: string | undefined): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export interface LocaleStats {
    total: number;
    done: number;
    todo: number;
    coverage: number;
    words: number;
}

export function calculateStats(entries: Iterable<any>): LocaleStats {
    let total = 0;
    let todo = 0;
    let words = 0;

    for (const entry of entries) {
        total++;
        if (isUntranslated(entry.targetXml)) {
            todo++;
        } else {
            words += countWords(entry.targetXml);
        }
    }

    const done = total - todo;
    const coverage = total > 0 ? (done / total) * 100 : 100;

    return { total, done, todo, coverage, words };
}

export function registerReportCommand(program: Command) {
    program
        .command("report")
        .description("Generate translation statistics report")
        .option("--source <path>", "Path to source messages.xlf", "src/locale/messages.xlf")
        .option("--locales <glob>", "Glob for locale files", "src/locale/messages.*.xlf")
        .action(async (opts) => {
            renderBanner("report");

            const spinner = ora("Scanning files...").start();

            try {
                // 1) Discover files
                const res = await discoverFiles({
                    sourcePath: opts.source,
                    localesGlob: opts.locales,
                });

                const rows: ReportRow[] = [];

                // 2) Parse each locale file
                for (const lf of res.localeFiles) {
                    const xml = await readFile(lf.filePath, "utf-8");
                    const parsed = parseXlf(xml);
                    const stats = calculateStats(parsed.entries.values());

                    rows.push({
                        locale: lf.locale,
                        version: parsed.version,
                        ...stats,
                    });
                }

                spinner.stop();

                // 3) Render table
                if (rows.length === 0) {
                    ui.warn("No locale files found.");
                } else {
                    renderReportTable(rows);
                }
            } catch (e: any) {
                spinner.fail("Failed");
                ui.error(e?.message ?? String(e));
                process.exitCode = 1;
            }
        });
}
