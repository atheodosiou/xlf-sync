import { describe, it, expect } from "vitest";
import { parseXlf } from "../src/core/xlf/index.js";

describe("XLIFF Parser", () => {
    describe("XLIFF 2.0", () => {
        it("should parse a simple XLIFF 2.0 file", () => {
            const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="de">
  <file id="f1">
    <unit id="intro">
      <segment>
        <source>Hello World</source>
        <target>Hallo Welt</target>
      </segment>
    </unit>
  </file>
</xliff>`;

            const result = parseXlf(xml);

            expect(result.version).toBe("2.0");
            expect(result.locale).toBe("de");
            expect(result.entries.size).toBe(1);
            expect(result.entries.get("intro")).toBeDefined();
            expect(result.entries.get("intro")?.sourceXml).toBe("Hello World");
            expect(result.entries.get("intro")?.targetXml).toBe("Hallo Welt");
        });

        it("should handle empty target", () => {
            const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="fr">
  <file id="f1">
    <unit id="greeting">
      <segment>
        <source>Welcome</source>
        <target></target>
      </segment>
    </unit>
  </file>
</xliff>`;

            const result = parseXlf(xml);

            expect(result.entries.get("greeting")?.targetXml).toBe("");
        });
    });

    describe("XLIFF 1.2", () => {
        it("should parse a simple XLIFF 1.2 file", () => {
            const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="el" datatype="plaintext">
    <body>
      <trans-unit id="welcome">
        <source>Welcome</source>
        <target>Καλώς ήρθατε</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

            const result = parseXlf(xml);

            expect(result.version).toBe("1.2");
            expect(result.locale).toBe("el");
            expect(result.entries.size).toBe(1);
            expect(result.entries.get("welcome")).toBeDefined();
            expect(result.entries.get("welcome")?.sourceXml).toBe("Welcome");
            expect(result.entries.get("welcome")?.targetXml).toBe("Καλώς ήρθατε");
        });
    });

    describe("Edge Cases", () => {
        it("should handle XML tags with attributes (XLIFF 2.0)", () => {
            const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="de">
  <file id="f1">
    <unit id="test">
      <segment>
        <source>Test</source>
        <target state="translated">Alt</target>
      </segment>
    </unit>
  </file>
</xliff>`;

            const result = parseXlf(xml);

            expect(result.entries.get("test")?.targetXml).toBe("Alt");
        });

        it("should handle special characters and entities", () => {
            const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="de">
  <file id="f1">
    <unit id="special">
      <segment>
        <source>Test &amp; "quotes" &lt;tags&gt;</source>
        <target>Test &amp; "Anführungszeichen" &lt;Tags&gt;</target>
      </segment>
    </unit>
  </file>
</xliff>`;

            const result = parseXlf(xml);

            expect(result.entries.get("special")?.sourceXml).toContain("&");
            expect(result.entries.get("special")?.targetXml).toContain("&");
        });

        it("should handle missing target element", () => {
            const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="de">
  <file id="f1">
    <unit id="notranslation">
      <segment>
        <source>Not translated yet</source>
      </segment>
    </unit>
  </file>
</xliff>`;

            const result = parseXlf(xml);

            expect(result.entries.get("notranslation")?.targetXml).toBeUndefined();
        });

        it("should handle multiple units in XLIFF 2.0", () => {
            const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="fr">
  <file id="f1">
    <unit id="first">
      <segment>
        <source>First</source>
        <target>Premier</target>
      </segment>
    </unit>
    <unit id="second">
      <segment>
        <source>Second</source>
        <target>Deuxième</target>
      </segment>
    </unit>
  </file>
</xliff>`;

            const result = parseXlf(xml);

            expect(result.entries.size).toBe(2);
            expect(result.entries.get("first")?.targetXml).toBe("Premier");
            expect(result.entries.get("second")?.targetXml).toBe("Deuxième");
        });
    });
});
