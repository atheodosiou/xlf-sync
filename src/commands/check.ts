import { Command } from "commander";
import ora from "ora";
import { ui } from "../ui/console.js";
import { discoverFiles } from "../core/discover.js";
import { readFile } from "node:fs/promises";
import { parseXlf } from "../core/xlf/index.js";
import { syncLocale } from "../core/sync.js";
import { renderSummaryTable } from "../ui/table.js";
import { renderBanner } from "../ui/banner.js";
import { loadConfig } from "../core/config.js";

export interface CheckOptions {
    source: string;
    locales: string;
    failOnMissing: boolean;
    failOnObsolete: boolean;
    failOnAdded: boolean;
    newTarget: "todo" | "empty" | "source";
    verbose: boolean;
}

export interface CheckResult {
    rows: any[];
    hasMissing: boolean;
    hasObsolete: boolean;
    hasAdded: boolean;
    missingKeysByLocale: Record<string, string[]>;
}

export async function performCheck(
    res: { sourcePath: string; localeFiles: { locale: string; filePath: string }[] },
    opts: Pick<CheckOptions, "newTarget">
): Promise<CheckResult> {
    const sourceXml = await readFile(res.sourcePath, "utf-8");
    const sourceParsed = parseXlf(sourceXml);

    const rows: any[] = [];
    const missingKeysByLocale: Record<string, string[]> = {};

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

        if (missingTargets > 0) {
            hasMissing = true;
            missingKeysByLocale[lf.locale] = diff.missingTargets.slice();
        }
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

    return { rows, hasMissing, hasObsolete, hasAdded, missingKeysByLocale };
}

export function getCheckFailureReasons(
    stats: { hasMissing: boolean; hasObsolete: boolean; hasAdded: boolean },
    opts: Pick<CheckOptions, "failOnMissing" | "failOnObsolete" | "failOnAdded">
): string[] {
    const reasons: string[] = [];
    if (opts.failOnMissing && stats.hasMissing) reasons.push("missing targets");
    if (opts.failOnObsolete && stats.hasObsolete) reasons.push("obsolete keys");
    if (opts.failOnAdded && stats.hasAdded) reasons.push("new keys need adding");
    return reasons;
}

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
        .option("--verbose", "Print missing keys per locale", false)
        .action(async (opts, cmd) => {
            renderBanner("check");

            const config = await loadConfig();
            const checkConfig = config.check || {};

            const finalOpts: CheckOptions = {
                source: cmd.getOptionValueSource("source") === "cli" ? opts.source : (config.source ?? opts.source),
                locales: cmd.getOptionValueSource("locales") === "cli" ? opts.locales : (config.locales ?? opts.locales),
                failOnMissing: cmd.getOptionValueSource("failOnMissing") === "cli" ? opts.failOnMissing : (checkConfig.failOnMissing ?? opts.failOnMissing),
                failOnObsolete: cmd.getOptionValueSource("failOnObsolete") === "cli" ? opts.failOnObsolete : (checkConfig.failOnObsolete ?? opts.failOnObsolete),
                failOnAdded: cmd.getOptionValueSource("failOnAdded") === "cli" ? opts.failOnAdded : (checkConfig.failOnAdded ?? opts.failOnAdded),
                newTarget: cmd.getOptionValueSource("newTarget") === "cli" ? opts.newTarget : (checkConfig.newTarget ?? opts.newTarget),
                verbose: cmd.getOptionValueSource("verbose") === "cli" ? opts.verbose : (checkConfig.verbose ?? opts.verbose),
            };

            const spinner = ora("Checking...").start();

            try {
                const res = await discoverFiles({
                    sourcePath: finalOpts.source,
                    localesGlob: finalOpts.locales,
                });

                const result = await performCheck(res, finalOpts);

                spinner.stop();
                renderSummaryTable(result.rows);

                if (finalOpts.verbose) {
                    const locales = Object.keys(result.missingKeysByLocale);
                    if (locales.length === 0) {
                        ui.success("No missing targets.");
                    } else {
                        ui.info("Missing targets:");
                        for (const locale of locales) {
                            ui.info(`- ${locale}:`);
                            for (const key of result.missingKeysByLocale[locale]) {
                                ui.info(`  • ${key}`);
                            }
                        }
                    }
                }

                const reasons = getCheckFailureReasons(result, finalOpts);

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
