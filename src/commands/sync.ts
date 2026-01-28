import { Command } from "commander";
import ora from "ora";
import { ui } from "../ui/console.js";
import { discoverFiles } from "../core/discover.js";
import { readFile, writeFile } from "node:fs/promises";
import { parseXlf, writeXlf } from "../core/xlf/index.js";
import { syncLocale } from "../core/sync.js";
import { renderSummaryTable } from "../ui/table.js";
import { buildGraveyardEntries } from "../core/graveyard.js";

function resolveGraveyardPath(pattern: string, locale: string) {
    return pattern.replaceAll("{locale}", locale);
}

export function registerSyncCommand(program: Command) {
    program
        .command("sync")
        .description("Sync locale XLF files with the source messages.xlf")
        .option("--source <path>", "Path to source messages.xlf", "src/locale/messages.xlf")
        .option("--locales <glob>", "Glob for locale files", "src/locale/messages.*.xlf")
        .option("--dry-run", "Do not write files, only report changes", false)
        .option("--new-target <mode>", "todo | empty | source", "todo")
        .option("--obsolete <mode>", "delete | mark | graveyard", "mark")
        .option(
            "--graveyard-file <path>",
            "Graveyard output path pattern",
            "src/locale/_obsolete.{locale}.xlf"
        )
        .action(async (opts) => {
            ui.headerBox("xlf-sync", "Sync XLIFF locale files");

            const spinner = ora("Scanning files...").start();

            try {
                // 1️⃣ Discover source + locale files
                const res = await discoverFiles({
                    sourcePath: opts.source,
                    localesGlob: opts.locales,
                });

                spinner.succeed(`Found ${res.localeFiles.length} locale file(s)`);

                for (const lf of res.localeFiles) {
                    ui.info(`- ${lf.locale}: ${lf.filePath}`);
                }

                // 2️⃣ Parse source file
                const sourceXml = await readFile(res.sourcePath, "utf-8");
                const sourceParsed = parseXlf(sourceXml);

                // 3️⃣ Parse locale files + compute diff + write (optional)
                const rows: {
                    locale: string;
                    version: string;
                    sourceKeys: number;
                    localeKeys: number;
                    added: number;
                    obsolete: number;
                    missingTargets: number;
                }[] = [];

                for (const lf of res.localeFiles) {
                    const xml = await readFile(lf.filePath, "utf-8");
                    const parsed = parseXlf(xml);

                    const diff = syncLocale(sourceParsed.entries, parsed.entries, {
                        newTarget: opts.newTarget,
                        obsolete: opts.obsolete,
                    });

                    // Main locale output:
                    // - merged never includes obsolete keys, so it stays clean.
                    // - if obsolete=mark, writers will append obsolete entries into the main file.
                    // - if obsolete=graveyard, we MUST NOT mark them inside main file.
                    const mainObsoleteKeys = opts.obsolete === "mark" ? diff.obsoleteKeys : [];

                    const mainOutputXml = writeXlf(parsed, diff.merged, mainObsoleteKeys, {
                        newTarget: opts.newTarget,
                        obsolete: opts.obsolete === "graveyard" ? "delete" : opts.obsolete,
                    });

                    if (!opts.dryRun) {
                        await writeFile(lf.filePath, mainOutputXml, "utf-8");
                    }

                    // Graveyard output (only when obsolete=graveyard)
                    if (opts.obsolete === "graveyard") {
                        const graveyardEntries = buildGraveyardEntries(parsed, diff.obsoleteKeys);

                        if (graveyardEntries.size > 0) {
                            const graveyardPath = resolveGraveyardPath(opts.graveyardFile, lf.locale);

                            // Write a file that contains ONLY the obsolete entries.
                            // We pass obsoleteKeys=[] and obsolete=delete so nothing extra is appended.
                            const graveyardXml = writeXlf(
                                parsed,
                                graveyardEntries,
                                [],
                                { newTarget: opts.newTarget, obsolete: "delete" }
                            );

                            if (!opts.dryRun) {
                                await writeFile(graveyardPath, graveyardXml, "utf-8");
                            }
                        }
                    }

                    rows.push({
                        locale: lf.locale,
                        version: parsed.version,
                        sourceKeys: sourceParsed.entries.size,
                        localeKeys: parsed.entries.size,
                        added: diff.addedKeys.length,
                        obsolete: diff.obsoleteKeys.length,
                        missingTargets: diff.missingTargets.length,
                    });
                }

                spinner.stop();

                // 4️⃣ Render summary table
                renderSummaryTable(rows);

                if (opts.dryRun) {
                    ui.success("Diff OK (dry-run)");
                } else {
                    ui.success(
                        opts.obsolete === "graveyard"
                            ? "Sync OK (files updated + graveyard written)"
                            : "Sync OK (files updated)"
                    );
                }
            } catch (e: any) {
                spinner.fail("Failed");
                ui.error(e?.message ?? String(e));
                process.exitCode = 1;
            }
        });
}
