import { Command } from "commander";
import ora from "ora";
import { ui } from "../ui/console.js";
import { discoverFiles } from "../core/discover.js";
import { readFile, writeFile } from "node:fs/promises";
import { parseXlf, writeXlf } from "../core/xlf/index.js";
import { syncLocale } from "../core/sync.js";
import { renderSummaryTable } from "../ui/table.js";
import { buildGraveyardEntries } from "../core/graveyard.js";
import { renderBanner } from "../ui/banner.js";

export function resolveGraveyardPath(pattern: string, locale: string) {
    return pattern.replaceAll("{locale}", locale);
}

export interface SyncOptions {
    source: string;
    locales: string;
    dryRun: boolean;
    newTarget: "todo" | "empty" | "source";
    obsolete: "delete" | "mark" | "graveyard";
    failOnMissing: boolean;
    graveyardFile: string;
}

export type SyncPlan = {
    lf: { locale: string; filePath: string };
    mainOutputXml: string;
    graveyardOutputXml?: string;
    graveyardPath?: string;
    stats: {
        locale: string;
        version: string;
        sourceKeys: number;
        localeKeys: number;
        added: number;
        obsolete: number;
        missingTargets: number;
    };
};

export function registerSyncCommand(program: Command) {
    program
        .command("sync")
        .description("Sync locale XLF files with the source messages.xlf")
        .option("--source <path>", "Path to source messages.xlf", "src/locale/messages.xlf")
        .option("--locales <glob>", "Glob for locale files", "src/locale/messages.*.xlf")
        .option("--dry-run", "Do not write files, only report changes", false)
        .option("--new-target <mode>", "todo | empty | source", "todo")
        .option("--obsolete <mode>", "delete | mark | graveyard", "mark")
        .option("--fail-on-missing", "Fail if missing targets exist (no files written)", false)
        .option(
            "--graveyard-file <path>",
            "Graveyard output path pattern",
            "src/locale/_obsolete.{locale}.xlf"
        )
        .action(async (opts) => {
            renderBanner("sync");

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

                const rows: {
                    locale: string;
                    version: string;
                    sourceKeys: number;
                    localeKeys: number;
                    added: number;
                    obsolete: number;
                    missingTargets: number;
                }[] = [];

                const plans: Plan[] = [];
                let hasMissing = false;

                // 3️⃣ PASS 1: compute diffs + prepare outputs (NO WRITES)
                for (const lf of res.localeFiles) {
                    const localeXml = await readFile(lf.filePath, "utf-8");
                    const parsed = parseXlf(localeXml);

                    const diff = syncLocale(sourceParsed.entries, parsed.entries, {
                        newTarget: opts.newTarget,
                        obsolete: opts.obsolete,
                    });

                    if (diff.missingTargets.length > 0) hasMissing = true;

                    rows.push({
                        locale: lf.locale,
                        version: parsed.version,
                        sourceKeys: sourceParsed.entries.size,
                        localeKeys: parsed.entries.size,
                        added: diff.addedKeys.length,
                        obsolete: diff.obsoleteKeys.length,
                        missingTargets: diff.missingTargets.length,
                    });

                    // MAIN OUTPUT
                    const mainObsoleteKeys = opts.obsolete === "mark" ? diff.obsoleteKeys : [];

                    const mainParsedClone = {
                        ...parsed,
                        raw: structuredClone(parsed.raw),
                    };

                    const mainOutputXml = writeXlf(mainParsedClone, diff.merged, mainObsoleteKeys, {
                        newTarget: opts.newTarget,
                        // if graveyard, main behaves like delete (keeps file clean)
                        obsolete: opts.obsolete === "graveyard" ? "delete" : opts.obsolete,
                    });

                    // GRAVEYARD OUTPUT (optional)
                    let graveyardOutputXml: string | undefined;
                    let graveyardPath: string | undefined;

                    if (opts.obsolete === "graveyard" && diff.obsoleteKeys.length > 0) {
                        const graveyardEntries = buildGraveyardEntries(parsed, diff.obsoleteKeys);

                        if (graveyardEntries.size > 0) {
                            graveyardPath = resolveGraveyardPath(opts.graveyardFile, lf.locale);

                            const graveParsedClone = {
                                ...parsed,
                                raw: structuredClone(parsed.raw),
                            };

                            graveyardOutputXml = writeXlf(graveParsedClone, graveyardEntries, [], {
                                newTarget: opts.newTarget,
                                obsolete: "delete",
                            });
                        }
                    }

                    plans.push({
                        lf,
                        mainOutputXml,
                        graveyardOutputXml,
                        graveyardPath,
                    });
                }

                spinner.stop();

                // 4️⃣ Render summary table
                renderSummaryTable(rows);

                // 5️⃣ FAIL GATE (prevents partial writes)
                if (opts.failOnMissing && hasMissing) {
                    ui.error(
                        "Sync failed: missing targets. Fix translations or choose a different --new-target strategy."
                    );
                    process.exitCode = 1;
                    return;
                }

                // 6️⃣ PASS 2: write outputs
                if (!opts.dryRun) {
                    for (const p of plans) {
                        await writeFile(p.lf.filePath, p.mainOutputXml, "utf-8");

                        if (opts.obsolete === "graveyard" && p.graveyardOutputXml && p.graveyardPath) {
                            await writeFile(p.graveyardPath, p.graveyardOutputXml, "utf-8");
                        }
                    }
                }

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
