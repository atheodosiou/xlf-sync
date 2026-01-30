import { MessageEntry } from "../types/model.js";

export type NewTargetMode = "todo" | "empty" | "source";
export type ObsoleteMode = "delete" | "mark" | "graveyard";

export function isUntranslated(target: string | undefined): boolean {
    if (!target) return true;
    const t = target.trim();
    return t === "" || t.toUpperCase() === "TODO";
}

export interface SyncOptions {
    newTarget: NewTargetMode;
    obsolete: ObsoleteMode;
}

export interface SyncResult {
    merged: Map<string, MessageEntry>;
    addedKeys: string[];
    obsoleteKeys: string[];
    keptKeys: string[];
    missingTargets: string[]; // keys that exist but have no target
}

export function syncLocale(
    source: Map<string, MessageEntry>,
    locale: Map<string, MessageEntry>,
    opts: SyncOptions
): SyncResult {
    const merged = new Map<string, MessageEntry>();

    const addedKeys: string[] = [];
    const obsoleteKeys: string[] = [];
    const keptKeys: string[] = [];
    const missingTargets: string[] = [];

    // 1) Build merged in the exact order of source
    for (const [key, srcEntry] of source.entries()) {
        const locEntry = locale.get(key);

        if (locEntry) {
            // keep existing translation if present
            const targetXml = locEntry.targetXml;
            merged.set(key, {
                key,
                sourceXml: srcEntry.sourceXml,
                targetXml,
            });
            keptKeys.push(key);
            if (isUntranslated(targetXml)) missingTargets.push(key);
        } else {
            // add new entry
            const targetXml = makeNewTarget(srcEntry.sourceXml, opts.newTarget);
            merged.set(key, {
                key,
                sourceXml: srcEntry.sourceXml,
                targetXml,
            });
            addedKeys.push(key);
            if (isUntranslated(targetXml)) missingTargets.push(key);
        }
    }

    // 2) Find obsolete keys (present in locale, not in source)
    for (const key of locale.keys()) {
        if (!source.has(key)) {
            obsoleteKeys.push(key);
            // for now we don't apply obsolete policy into merged (next step)
        }
    }

    return { merged, addedKeys, obsoleteKeys, keptKeys, missingTargets };
}

function makeNewTarget(sourceXml: string, mode: NewTargetMode): string | undefined {
    if (mode === "empty") return "";
    if (mode === "source") return sourceXml;
    return "TODO";
}
