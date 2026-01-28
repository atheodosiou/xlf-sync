import { Command } from "commander";
import { ui } from "../ui/console.js";

export function registerCheckCommand(program: Command) {
    program
        .command("check")
        .description("Check whether locale files are in sync (CI-friendly)")
        .option("--source <path>", "Path to source messages.xlf", "src/locale/messages.xlf")
        .option("--locales <glob>", "Glob for locale files", "src/locale/messages.*.xlf")
        .option("--fail-on-missing", "Fail if there are missing translations", false)
        .action(async () => {
            // TODO: implement
            ui.success("Check passed (stub)");
        });
}
