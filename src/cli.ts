#!/usr/bin/env node
import { Command } from "commander";
import { registerCheckCommand } from "./commands/check";
import { registerReportCommand } from "./commands/report";
import { registerSyncCommand } from "./commands/sync";
import pkg from "../package.json";
import { getBanner } from "./ui/banner";

const program = new Command();

program
    .name("xlf-sync")
    .description(
        "A powerful CLI tool to keep your Angular XLIFF translation files (1.2 & 2.0) in sync with your source messages.\n\n" +
        "Automatically merges new translations, marks obsolete keys, and validates structure."
    )
    .version(pkg.version)
    .addHelpText("before", getBanner());

registerSyncCommand(program);
registerCheckCommand(program);
registerReportCommand(program);

program.parse(process.argv);
