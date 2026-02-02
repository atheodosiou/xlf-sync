
import { describe, it, expect } from "vitest";
import { parseV12 } from "../src/core/xlf/v12";
import { writeV12 } from "../src/core/xlf/write-v12";
import { parseV20 } from "../src/core/xlf/v20";
import { XMLParser } from "fast-xml-parser";

const parserV12 = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

describe("Regression Tests (v1.3.5)", () => {

  describe("Numeric/Boolean Serialization (Fix [object Object])", () => {
    it("should correctly extract numeric values from V12 contexts", () => {
      const xml = `
            <xliff version="1.2">
              <file source-language="en" datatype="plaintext" original="ng2.template">
                <body>
                  <trans-unit id="test">
                    <source>Hello</source>
                    <context-group purpose="location">
                      <context context-type="linenumber">42</context>
                      <context context-type="flag">true</context>
                    </context-group>
                  </trans-unit>
                </body>
              </file>
            </xliff>`;

      const doc = parserV12.parse(xml);
      const parsed = parseV12(doc);
      const entry = parsed.entries.get("test");

      expect(entry).toBeDefined();
      const lineCtx = entry?.contexts?.find(c => c.type === "linenumber");
      const flagCtx = entry?.contexts?.find(c => c.type === "flag");

      expect(lineCtx?.content).toBe("42");
      expect(flagCtx?.content).toBe("true");
    });

    it("should correctly extract numeric values from V20 notes", () => {
      const xml = `
            <xliff version="2.0" srcLang="en">
              <file id="ngi18n">
                <unit id="test">
                  <notes>
                    <note category="priority">1</note>
                  </notes>
                  <segment>
                    <source>Hello</source>
                  </segment>
                </unit>
              </file>
            </xliff>`;

      const doc = parserV12.parse(xml);
      const parsed = parseV20(doc);
      const entry = parsed.entries.get("test");

      expect(entry).toBeDefined();
      expect(entry?.notes?.[0].content).toBe("1");
    });
  });

  describe("Empty Body Handling (Fix missing body crashing)", () => {
    it("should handle missing text inside body gracefully in V12", () => {
      const xml = `
            <xliff version="1.2">
              <file source-language="en" original="ng2.template">
                <body></body>
              </file>
            </xliff>`;

      const doc = parserV12.parse(xml);
      const parsed = parseV12(doc);
      expect(parsed.entries.size).toBe(0);
    });

    it("should check write loop handles empty body re-initialization", () => {
      const xml = `
            <xliff version="1.2">
              <file source-language="en" original="ng2.template">
                <body></body>
              </file>
            </xliff>`;

      const doc = parserV12.parse(xml);
      const parsed = parseV12(doc);

      parsed.entries.set("new", {
        key: "new",
        sourceXml: "New Key"
      });

      const output = writeV12(doc, parsed.entries, [], { newTarget: "todo", obsolete: "mark" });
      expect(output).toContain('<trans-unit id="new"');
    });
  });
});
