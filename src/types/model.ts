export type XlfVersion = "1.2" | "2.0";

export interface MessageEntry {
    key: string;              // trans-unit id or unit[:segment]
    sourceXml: string;        // inner XML content (not plain text)
    targetXml?: string;
}

export interface ParsedXlf {
    version: XlfVersion;
    locale?: string;          // e.g. el, de (if present)
    entries: Map<string, MessageEntry>;
    raw: any;                 // original parsed tree for serialization
}

export type NewTargetMode = "todo" | "empty" | "source";
export type ObsoleteMode = "delete" | "mark" | "graveyard";

export interface WriteOptions {
    newTarget: NewTargetMode;
    obsolete: ObsoleteMode;
}
