import fg from "fast-glob";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface DiscoverOptions {
    sourcePath: string;
    localesGlob: string;
}

export interface LocaleFile {
    locale: string; // e.g. "el" or "el-GR"
    filePath: string;
}

export interface DiscoverResult {
    sourcePath: string;
    localeFiles: LocaleFile[];
}

function extractLocaleFromFilename(filePath: string): string | null {
    // supports:
    // messages.el.xlf
    // messages.el-GR.xlf
    // messages.fr-CA.xlf
    const base = path.basename(filePath);
    const m = base.match(/^messages\.([a-z]{2}(?:-[A-Z]{2})?)\.xlf$/);
    return m?.[1] ?? null;
}

export async function discoverFiles(opts: DiscoverOptions): Promise<DiscoverResult> {
    // validate source exists
    await fs.access(opts.sourcePath);

    const matches = await fg(opts.localesGlob, { onlyFiles: true, unique: true });

    const localeFiles: LocaleFile[] = [];
    for (const filePath of matches) {
        // ignore the source file if glob accidentally matches it
        if (path.resolve(filePath) === path.resolve(opts.sourcePath)) continue;

        const locale = extractLocaleFromFilename(filePath);
        if (!locale) continue;

        localeFiles.push({ locale, filePath });
    }

    // sort for stable output
    localeFiles.sort((a, b) => a.locale.localeCompare(b.locale));

    // dedupe locale collisions (same locale appears twice)
    const seen = new Map<string, string>();
    for (const lf of localeFiles) {
        if (seen.has(lf.locale)) {
            const prev = seen.get(lf.locale)!;
            throw new Error(
                `Duplicate locale "${lf.locale}" detected:\n- ${prev}\n- ${lf.filePath}\n` +
                `Fix by removing one file or adjusting --locales glob.`
            );
        }
        seen.set(lf.locale, lf.filePath);
    }

    return { sourcePath: opts.sourcePath, localeFiles };
}
