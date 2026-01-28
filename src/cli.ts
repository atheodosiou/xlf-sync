#!/usr/bin/env node
import { Command } from "commander";
import { registerCheckCommand } from "./commands/check";
import { registerReportCommand } from "./commands/report";
import { registerSyncCommand } from "./commands/sync";

const program = new Command();

program
    .name("xlf-sync")
    .description("Sync Angular XLIFF (1.2 & 2.0) locale files with messages.xlf")
    .version("0.1.0");

registerSyncCommand(program);
registerCheckCommand(program);
registerReportCommand(program);

program.parse(process.argv);


// https://chatgpt.com/c/6978c595-664c-8328-9756-4a51d628277b