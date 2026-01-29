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

export interface ReportRow {
    locale: string;
    version: string;
    total: number;
    done: number;
    todo: number;
    coverage: number;
    words: number;
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

export function renderReportTable(rows: ReportRow[]) {
    const table = new Table({
        head: [
            chalk.bold("Locale"),
            chalk.bold("XLF"),
            chalk.bold("Keys"),
            chalk.bold("Translated"),
            chalk.bold("Pending"),
            chalk.bold("% Cov"),
            chalk.bold("Words"),
        ],
    });

    for (const r of rows) {
        const covColor =
            r.coverage === 100
                ? chalk.green
                : r.coverage >= 80
                    ? chalk.yellow
                    : chalk.red;

        table.push([
            r.locale,
            r.version,
            r.total,
            r.done,
            r.todo === 0 ? chalk.dim("0") : chalk.yellow(String(r.todo)),
            covColor(`${r.coverage.toFixed(1)}%`),
            r.words,
        ]);
    }

    console.log(table.toString());
}
