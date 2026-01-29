import figlet from "figlet";
import chalk from "chalk";
import pkg from "../../package.json";

export function renderBanner(command?: string) {
    const logo = figlet.textSync("XLF-SYNC", {
        font: "Standard", // μπορείς να αλλάξεις font
        horizontalLayout: "default",
        verticalLayout: "default",
    });

    console.log(chalk.cyanBright(logo));

    console.log(
        chalk.bold.white(
            `XLF-SYNC  v${pkg.version}${command ? `   [${command}]` : ""}`
        )
    );

    console.log(chalk.gray("Sync & validate Angular XLIFF files"));
    console.log(chalk.gray("Author: Anastasios Theodosiou\n"));
}
