import { readFile } from "fs/promises";
import { join } from "path";

export interface Config {
    source?: string;
    locales?: string;
    sync?: {
        newTarget?: "todo" | "empty" | "source";
        obsolete?: "delete" | "mark" | "graveyard";
        graveyardFile?: string;
        failOnMissing?: boolean;
        dryRun?: boolean;
    };
    check?: {
        failOnMissing?: boolean;
        failOnObsolete?: boolean;
        failOnAdded?: boolean;
        newTarget?: "todo" | "empty" | "source";
        verbose?: boolean;
    };
}

export async function loadConfig(cwd: string = process.cwd()): Promise<Config> {
    const filenames = ["xlf-sync.json", "xlf-sync.config.json"];

    for (const name of filenames) {
        try {
            const path = join(cwd, name);
            const content = await readFile(path, "utf-8");
            return JSON.parse(content);
        } catch (e) {
            // ignore if file not found or invalid JSON
            continue;
        }
    }

    return {};
}
