import { Command } from "commander";
import { ui } from "../ui/console.js";
import { renderBanner } from "../ui/banner.js";

export function registerReportCommand(program: Command) {
    program
        .command("report")
        .description("Generate translation coverage report")
        .option("--source <path>", "Path to source messages.xlf", "src/locale/messages.xlf")
        .option("--locales <glob>", "Glob for locale files", "src/locale/messages.*.xlf")
        .option("--format <fmt>", "table | json", "table")
        .action(async (opts) => {
            // TODO: implement
            renderBanner("report");
            ui.success(`Report generated (stub, format=${opts.format})`);
        });
}
