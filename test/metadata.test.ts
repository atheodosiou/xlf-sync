import { describe, it, expect } from "vitest";
import { parseV12 } from "../src/core/xlf/v12";
import { writeV12 } from "../src/core/xlf/write-v12";
import { parseV20 } from "../src/core/xlf/v20";
import { writeV20 } from "../src/core/xlf/write-v20";
import { syncLocale } from "../src/core/sync";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: false,
});

describe("Metadata Preservation", () => {
  describe("V12", () => {
    it("should preserve attributes, notes, and context-groups", () => {
      const xml = `
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" datatype="plaintext" original="ng2.template">
    <body>
      <trans-unit id="testId" approved="yes">
        <source>Hello</source>
        <note priority="1" from="description">Greeting</note>
        <context-group purpose="location">
          <context context-type="sourcefile">app/app.component.ts</context>
          <context context-type="linenumber">10</context>
        </context-group>
      </trans-unit>
    </body>
  </file>
</xliff>`;
      const parsed = parseV12(parser.parse(xml));
      const entry = parsed.entries.get("testId")!;

      expect(entry.attributes).toEqual({ "@_approved": "yes" });
      expect(entry.notes).toHaveLength(1);
      expect(entry.notes![0]).toEqual({ content: "Greeting", priority: "1", from: "description" });
      expect(entry.contexts).toHaveLength(2);

      // Simulate sync (pass-through)
      const syncResult = syncLocale(parsed.entries, new Map(), { newTarget: "todo", obsolete: "mark" });
      const output = writeV12(parsed.raw, syncResult.merged, [], { newTarget: "todo", obsolete: "mark" });

      expect(output).toContain('approved="yes"');
      expect(output).toContain('<note from="description" priority="1">Greeting</note>');
      expect(output).toContain('<context context-type="sourcefile">app/app.component.ts</context>');
    });

    it("should merge attributes and notes from locale", () => {
      const sourceXml = `
<xliff version="1.2">
  <file><body><trans-unit id="1"><source>Hi</source><note>Source Note</note></trans-unit></body></file>
</xliff>`;
      const localeXml = `
<xliff version="1.2">
  <file><body><trans-unit id="1" approved="yes"><source>Hi</source><target>Hola</target><note>Locale Note</note></trans-unit></body></file>
</xliff>`;
      const source = parseV12(parser.parse(sourceXml));
      const locale = parseV12(parser.parse(localeXml));

      const res = syncLocale(source.entries, locale.entries, { newTarget: "todo", obsolete: "mark" });
      const mergedEntry = res.merged.get("1")!;

      // Attributes: merged (locale ok)
      expect(mergedEntry.attributes).toEqual({ "@_approved": "yes" });
      // Notes: merged (both present)
      expect(mergedEntry.notes).toHaveLength(2);
      expect(mergedEntry.notes?.map(n => n.content)).toContain("Source Note");
      expect(mergedEntry.notes?.map(n => n.content)).toContain("Locale Note");
    });

    it("should preserve metadata when marking as obsolete", () => {
      const xml = `
<xliff version="1.2">
  <file>
    <body>
      <trans-unit id="old1" approved="yes">
        <source>Old</source><target>OldT</target>
        <note from="me">Keep this</note>
      </trans-unit>
    </body>
  </file>
</xliff>`;
      const parsed = parseV12(parser.parse(xml));
      const res = syncLocale(new Map(), parsed.entries, { newTarget: "todo", obsolete: "mark" });
      const output = writeV12(parsed.raw, res.merged, res.obsoleteKeys, { newTarget: "todo", obsolete: "mark" });

      expect(output).toContain('state="obsolete">OldT');
      expect(output).toContain('approved="yes"');
      expect(output).toContain('<note from="me">Keep this</note>');
    });
  });

  describe("V20", () => {
    it("should preserve unit attributes and notes", () => {
      const xml = `
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en">
  <file>
    <unit id="u1" translate="no">
      <notes>
        <note category="description">Desc</note>
      </notes>
      <segment>
        <source>Hello</source>
      </segment>
    </unit>
  </file>
</xliff>`;
      const parsed = parseV20(parser.parse(xml));
      const entry = parsed.entries.get("u1")!;

      expect(entry.attributes).toEqual({ "@_translate": "no" });
      expect(entry.notes).toHaveLength(1);
      expect(entry.notes![0].category).toBe("description");

      const syncResult = syncLocale(parsed.entries, new Map(), { newTarget: "todo", obsolete: "mark" });
      const output = writeV20(parsed.raw, syncResult.merged, [], { newTarget: "todo", obsolete: "mark" });

      expect(output).toContain('translate="no"');
      expect(output).toContain('<note category="description">Desc</note>');
    });

    it("should preserve metadata when marking as obsolete", () => {
      const xml = `
<xliff version="2.0">
 <file>
   <unit id="u1" translate="no">
     <notes><note category="old">Old Note</note></notes>
     <segment><source>Old</source><target>Old Trg</target></segment>
   </unit>
 </file>
</xliff>`;
      const parsed = parseV20(parser.parse(xml));
      const res = syncLocale(new Map(), parsed.entries, { newTarget: "todo", obsolete: "mark" });
      const output = writeV20(parsed.raw, res.merged, res.obsoleteKeys, { newTarget: "todo", obsolete: "mark" });

      expect(output).toContain('state="obsolete">Old Trg');
      expect(output).toContain('translate="no"');
      expect(output).toContain('<note category="old">Old Note</note>');
    });
  });
});
