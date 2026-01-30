import { Command } from "commander";
import ora from "ora";
import { writeFile, readFile } from "node:fs/promises";
import { ui } from "../ui/console.js";
import { discoverFiles } from "../core/discover.js";
import { performReport } from "./report.js";
import { parseXlf } from "../core/xlf/index.js";
import { isUntranslated } from "../core/sync.js";
import { generateDashboardHtml } from "../core/dashboard-gen.js";
import { renderBanner } from "../ui/banner.js";
import { loadConfig } from "../core/config.js";
import pkg from "../../package.json";

export function registerDashboardCommand(program: Command) {
    program
        .command("dashboard")
        .description("Generate a modern HTML dashboard for translation status")
        .option("--source <path>", "Path to source messages.xlf", "src/locale/messages.xlf")
        .option("--locales <glob>", "Glob for locale files", "src/locale/messages.*.xlf")
        .option("--out <path>", "Output HTML file path", "xlf-report.html")
        .action(async (opts, cmd) => {
            renderBanner("dashboard");

            const config = await loadConfig();

            const finalOpts = {
                source: cmd.getOptionValueSource("source") === "cli" ? opts.source : (config.source ?? opts.source),
                locales: cmd.getOptionValueSource("locales") === "cli" ? opts.locales : (config.locales ?? opts.locales),
                out: opts.out,
            };

            const spinner = ora("Collecting statistics...").start();

            try {
                const sourceXml = await readFile(finalOpts.source, "utf-8");
                const sourceParsed = parseXlf(sourceXml);
                const sourceIds = Array.from(sourceParsed.entries.keys());

                const res = await discoverFiles({
                    sourcePath: finalOpts.source,
                    localesGlob: finalOpts.locales,
                });

                const reportRows = await performReport(res);

                // Map fields for UI: total -> keys, todo -> pending
                const stats = reportRows.map(r => ({
                    ...r,
                    keys: r.total,
                    pending: r.todo,
                    percentage: `${r.coverage.toFixed(1)}%`
                }));

                // Build matrix
                const matrix = [];
                const locales = res.localeFiles.map(lf => lf.locale);

                for (const id of sourceIds) {
                    const status: { [locale: string]: boolean } = {};
                    for (const lf of res.localeFiles) {
                        const xml = await readFile(lf.filePath, "utf-8");
                        const parsed = parseXlf(xml);
                        const entry = parsed.entries.get(id);
                        status[lf.locale] = entry ? !isUntranslated(entry.targetXml) : false;
                    }
                    matrix.push({ id, locales: status });
                }

                const html = generateDashboardHtml({ stats, matrix, locales }, pkg.version);

                await writeFile(finalOpts.out, html, "utf-8");

                spinner.succeed(`Dashboard generated: ${finalOpts.out}`);
                ui.success("\nYou can open this file in any web browser to view the report.");
            } catch (e: any) {
                spinner.fail("Failed to generate dashboard");
                ui.error(e?.message ?? String(e));
                process.exitCode = 1;
            }
        });
}
