import figlet from "figlet";
import chalk from "chalk";
import pkg from "../../package.json";

export function getBanner(command?: string) {
    const logo = figlet.textSync("XLF-SYNC", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default",
    });

    const lines = [
        chalk.cyanBright(logo),
        chalk.bold.white(
            `XLF-SYNC  v${pkg.version}${command ? `   [${command}]` : ""}`
        ),
        chalk.gray("Sync & validate Angular XLIFF files"),
        chalk.gray("Author: Anastasios Theodosiou\n"),
    ];

    return lines.join("\n");
}

export function renderBanner(command?: string) {
    console.log(getBanner(command));
}
