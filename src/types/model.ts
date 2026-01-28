export type XlfVersion = "1.2" | "2.0";

export interface MessageEntry {
    key: string;              // trans-unit id ή unit[:segment]
    sourceXml: string;        // inner XML (όχι απλό text)
    targetXml?: string;
}

export interface ParsedXlf {
    version: XlfVersion;
    locale?: string;          // π.χ. el, de (αν υπάρχει)
    entries: Map<string, MessageEntry>;
    raw: any;                 // original parsed tree (για serialize αργότερα)
}

export type NewTargetMode = "todo" | "empty" | "source";
export type ObsoleteMode = "delete" | "mark" | "graveyard";

export interface WriteOptions {
    newTarget: NewTargetMode;
    obsolete: ObsoleteMode;
    // for now: mark obsolete by adding a comment (MVP)
}
