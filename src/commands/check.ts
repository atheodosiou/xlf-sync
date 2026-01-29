import { Command } from "commander";
import ora from "ora";
import { ui } from "../ui/console.js";
import { discoverFiles } from "../core/discover.js";
import { readFile } from "node:fs/promises";
import { parseXlf } from "../core/xlf/index.js";
import { syncLocale } from "../core/sync.js";
import { renderSummaryTable } from "../ui/table.js";
import { renderBanner } from "../ui/banner.js";

export function registerCheckCommand(program: Command) {
    program
        .command("check")
        .description("Check if locale XLF files are in sync (CI-friendly)")
        .option("--source <path>", "Path to source messages.xlf", "src/locale/messages.xlf")
        .option("--locales <glob>", "Glob for locale files", "src/locale/messages.*.xlf")
        .option("--fail-on-missing", "Exit non-zero if missing targets exist", false)
        .option("--fail-on-obsolete", "Exit non-zero if obsolete keys exist", false)
        .option("--fail-on-added", "Exit non-zero if new keys would be added", false)
        .option("--new-target <mode>", "todo | empty | source (used for diff only)", "todo")
        .action(async (opts) => {
            renderBanner("check");

            const spinner = ora("Checking...").start();

            try {
                const res = await discoverFiles({
                    sourcePath: opts.source,
                    localesGlob: opts.locales,
                });

                const sourceXml = await readFile(res.sourcePath, "utf-8");
                const sourceParsed = parseXlf(sourceXml);

                const rows: any[] = [];
                let hasMissing = false;
                let hasObsolete = false;
                let hasAdded = false;

                for (const lf of res.localeFiles) {
                    const xml = await readFile(lf.filePath, "utf-8");
                    const parsed = parseXlf(xml);

                    const diff = syncLocale(sourceParsed.entries, parsed.entries, {
                        newTarget: opts.newTarget,
                        obsolete: "delete",
                    });

                    const missingTargets = diff.missingTargets.length;
                    const obsolete = diff.obsoleteKeys.length;
                    const added = diff.addedKeys.length;

                    if (missingTargets > 0) hasMissing = true;
                    if (obsolete > 0) hasObsolete = true;
                    if (added > 0) hasAdded = true;

                    rows.push({
                        locale: lf.locale,
                        version: parsed.version,
                        sourceKeys: sourceParsed.entries.size,
                        localeKeys: parsed.entries.size,
                        added,
                        obsolete,
                        missingTargets,
                    });
                }

                spinner.stop();
                renderSummaryTable(rows);

                const reasons: string[] = [];
                if (opts.failOnMissing && hasMissing) reasons.push("missing targets");
                if (opts.failOnObsolete && hasObsolete) reasons.push("obsolete keys");
                if (opts.failOnAdded && hasAdded) reasons.push("new keys need adding");

                if (reasons.length > 0) {
                    ui.error(`Check failed: ${reasons.join(", ")}`);
                    process.exitCode = 1;
                } else {
                    ui.success("Check OK");
                }
            } catch (e: any) {
                spinner.fail("Failed");
                ui.error(e?.message ?? String(e));
                process.exitCode = 1;
            }
        });
}
