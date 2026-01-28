import chalk from "chalk";
import logSymbols from "log-symbols";
import boxen from "boxen";

export const ui = {
    info: (msg: string) => console.log(chalk.cyan(msg)),
    success: (msg: string) => console.log(`${logSymbols.success} ${chalk.green(msg)}`),
    warn: (msg: string) => console.log(`${logSymbols.warning} ${chalk.yellow(msg)}`),
    error: (msg: string) => console.error(`${logSymbols.error} ${chalk.red(msg)}`),
    headerBox: (title: string, subtitle?: string) =>
        console.log(
            boxen(
                `${chalk.bold(title)}${subtitle ? `\n${chalk.dim(subtitle)}` : ""}`,
                { padding: 1, borderStyle: "round" }
            )
        ),
};
