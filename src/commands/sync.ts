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
import { loadConfig } from "../core/config.js";

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

export async function preparePlans(
    res: { sourcePath: string; localeFiles: { locale: string; filePath: string }[] },
    opts: SyncOptions
): Promise<SyncPlan[]> {
    const sourceXml = await readFile(res.sourcePath, "utf-8");
    const sourceParsed = parseXlf(sourceXml);
    const plans: SyncPlan[] = [];

    for (const lf of res.localeFiles) {
        const localeXml = await readFile(lf.filePath, "utf-8");
        const parsed = parseXlf(localeXml);

        const diff = syncLocale(sourceParsed.entries, parsed.entries, {
            newTarget: opts.newTarget,
            obsolete: opts.obsolete,
        });

        const mainObsoleteKeys = opts.obsolete === "mark" ? diff.obsoleteKeys : [];
        const mainParsedClone = { ...parsed, raw: structuredClone(parsed.raw) };

        const mainOutputXml = writeXlf(mainParsedClone, diff.merged, mainObsoleteKeys, {
            newTarget: opts.newTarget,
            obsolete: opts.obsolete === "graveyard" ? "delete" : opts.obsolete,
        });

        let graveyardOutputXml: string | undefined;
        let graveyardPath: string | undefined;

        if (opts.obsolete === "graveyard" && diff.obsoleteKeys.length > 0) {
            const graveyardEntries = buildGraveyardEntries(parsed, diff.obsoleteKeys);
            if (graveyardEntries.size > 0) {
                graveyardPath = resolveGraveyardPath(opts.graveyardFile, lf.locale);
                const graveParsedClone = { ...parsed, raw: structuredClone(parsed.raw) };
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
            stats: {
                locale: lf.locale,
                version: parsed.version,
                sourceKeys: sourceParsed.entries.size,
                localeKeys: parsed.entries.size,
                added: diff.addedKeys.length,
                obsolete: diff.obsoleteKeys.length,
                missingTargets: diff.missingTargets.length,
            },
        });
    }
    return plans;
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
        .option("--fail-on-missing", "Fail if missing targets exist (no files written)", false)
        .option(
            "--graveyard-file <path>",
            "Graveyard output path pattern",
            "src/locale/_obsolete.{locale}.xlf"
        )
        .action(async (opts, cmd) => {
            renderBanner("sync");

            const config = await loadConfig();
            const syncConfig = config.sync || {};

            // Merge logic: CLI > Config > Defaults
            const finalOpts: SyncOptions = {
                source: cmd.getOptionValueSource("source") === "cli" ? opts.source : (config.source ?? opts.source),
                locales: cmd.getOptionValueSource("locales") === "cli" ? opts.locales : (config.locales ?? opts.locales),
                dryRun: cmd.getOptionValueSource("dryRun") === "cli" ? opts.dryRun : (syncConfig.dryRun ?? opts.dryRun),
                newTarget: cmd.getOptionValueSource("newTarget") === "cli" ? opts.newTarget : (syncConfig.newTarget ?? opts.newTarget),
                obsolete: cmd.getOptionValueSource("obsolete") === "cli" ? opts.obsolete : (syncConfig.obsolete ?? opts.obsolete),
                failOnMissing: cmd.getOptionValueSource("failOnMissing") === "cli" ? opts.failOnMissing : (syncConfig.failOnMissing ?? opts.failOnMissing),
                graveyardFile: cmd.getOptionValueSource("graveyardFile") === "cli" ? opts.graveyardFile : (syncConfig.graveyardFile ?? opts.graveyardFile),
            };

            const spinner = ora("Scanning files...").start();

            try {
                const res = await discoverFiles({
                    sourcePath: finalOpts.source,
                    localesGlob: finalOpts.locales,
                });

                spinner.succeed(`Found ${res.localeFiles.length} locale file(s)`);

                const plans = await preparePlans(res, finalOpts);

                const rows = plans.map(p => p.stats);
                const hasMissing = plans.some(p => p.stats.missingTargets > 0);

                spinner.stop();
                renderSummaryTable(rows);

                if (finalOpts.failOnMissing && hasMissing) {
                    ui.error("Sync failed: missing targets.");
                    process.exitCode = 1;
                    return;
                }

                if (!finalOpts.dryRun) {
                    for (const p of plans) {
                        await writeFile(p.lf.filePath, p.mainOutputXml, "utf-8");
                        if (p.graveyardOutputXml && p.graveyardPath) {
                            await writeFile(p.graveyardPath, p.graveyardOutputXml, "utf-8");
                        }
                    }
                }

                if (finalOpts.dryRun) {
                    ui.success("Diff OK (dry-run)");
                } else {
                    ui.success(finalOpts.obsolete === "graveyard" ? "Sync OK (graveyard)" : "Sync OK");
                }
            } catch (e: any) {
                spinner.fail("Failed");
                ui.error(e?.message ?? String(e));
                process.exitCode = 1;
            }
        });
}
