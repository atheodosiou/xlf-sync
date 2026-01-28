import { Command } from "commander";
import ora from "ora";
import { ui } from "../ui/console.js";
import { discoverFiles } from "../core/discover.js";

export function registerSyncCommand(program: Command) {
    program
        .command("sync")
        .description("Sync locale XLF files with the source messages.xlf")
        .option("--source <path>", "Path to source messages.xlf", "src/locale/messages.xlf")
        .option("--locales <glob>", "Glob for locale files", "src/locale/messages.*.xlf")
        .option("--dry-run", "Do not write files, only report changes", false)
        .option("--new-target <mode>", "todo | empty | source", "todo")
        .option("--obsolete <mode>", "delete | mark | graveyard", "mark")
        .option("--graveyard-file <path>", "Graveyard output path pattern", "src/locale/_obsolete.{locale}.xlf")
        .action(async (opts) => {
            ui.headerBox("xlf-sync", "Sync XLIFF locale files");

            const spinner = ora("Scanning files...").start();
            try {
                const res = await discoverFiles({
                    sourcePath: opts.source,
                    localesGlob: opts.locales,
                });

                spinner.succeed(`Found ${res.localeFiles.length} locale file(s)`);

                for (const lf of res.localeFiles) {
                    ui.info(`- ${lf.locale}: ${lf.filePath}`);
                }

                ui.success("Discovery OK");
            } catch (e: any) {
                spinner.fail("Failed");
                ui.error(e?.message ?? String(e));
                process.exitCode = 1;
            }

        });
}
