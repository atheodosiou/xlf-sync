import Table from "cli-table3";
import chalk from "chalk";

export interface LocaleRow {
    locale: string;
    version: string;
    sourceKeys: number;
    localeKeys: number;
    added: number;
    obsolete: number;
    missingTargets: number;
}

export function renderSummaryTable(rows: LocaleRow[]) {
    const table = new Table({
        head: [
            chalk.bold("Locale"),
            chalk.bold("XLF"),
            chalk.bold("Source"),
            chalk.bold("Locale"),
            chalk.bold("Add"),
            chalk.bold("Obsolete"),
            chalk.bold("Missing targets"),
        ],
    });

    for (const r of rows) {
        table.push([
            r.locale,
            r.version,
            r.sourceKeys,
            r.localeKeys,
            r.added === 0 ? chalk.dim("0") : chalk.yellow(String(r.added)),
            r.obsolete === 0 ? chalk.dim("0") : chalk.red(String(r.obsolete)),
            r.missingTargets === 0 ? chalk.dim("0") : chalk.yellow(String(r.missingTargets)),
        ]);
    }

    console.log(table.toString());
}
