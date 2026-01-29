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

                // 3️⃣ Per-locale sync
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
                    const localeXml = await readFile(lf.filePath, "utf-8");
                    const parsed = parseXlf(localeXml);

                    const diff = syncLocale(sourceParsed.entries, parsed.entries, {
                        newTarget: opts.newTarget,
                        obsolete: opts.obsolete,
                    });

                    // ✅ IMPORTANT: writers MUTATE rawDoc, so we CLONE before each write.
                    // Also, build graveyard entries BEFORE any write mutates rawDoc.
                    const graveyardEntries =
                        opts.obsolete === "graveyard"
                            ? buildGraveyardEntries(parsed, diff.obsoleteKeys)
                            : new Map();

                    // MAIN OUTPUT
                    // - if obsolete=mark => append obsolete inside main
                    // - if obsolete=graveyard => do NOT append obsolete inside main
                    const mainObsoleteKeys = opts.obsolete === "mark" ? diff.obsoleteKeys : [];

                    const mainParsedClone = {
                        ...parsed,
                        raw: structuredClone(parsed.raw),
                    };

                    const mainOutputXml = writeXlf(
                        mainParsedClone,
                        diff.merged,
                        mainObsoleteKeys,
                        {
                            newTarget: opts.newTarget,
                            // if graveyard, main behaves like delete (keeps file clean)
                            obsolete: opts.obsolete === "graveyard" ? "delete" : opts.obsolete,
                        }
                    );

                    if (!opts.dryRun) {
                        await writeFile(lf.filePath, mainOutputXml, "utf-8");
                    }

                    // GRAVEYARD OUTPUT
                    if (opts.obsolete === "graveyard" && graveyardEntries.size > 0) {
                        const graveyardPath = resolveGraveyardPath(opts.graveyardFile, lf.locale);

                        const graveParsedClone = {
                            ...parsed,
                            raw: structuredClone(parsed.raw),
                        };

                        const graveyardXml = writeXlf(
                            graveParsedClone,
                            graveyardEntries,
                            [],
                            { newTarget: opts.newTarget, obsolete: "delete" }
                        );

                        if (!opts.dryRun) {
                            await writeFile(graveyardPath, graveyardXml, "utf-8");
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
