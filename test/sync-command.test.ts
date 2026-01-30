import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveGraveyardPath, preparePlans, SyncOptions } from "../src/commands/sync.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_DIR = join(process.cwd(), "test-temp-sync");

describe("Sync Command Utils", () => {
    describe("resolveGraveyardPath", () => {
        it("should replace {locale} placeholder", () => {
            const pattern = "path/to/backup.{locale}.xlf";
            expect(resolveGraveyardPath(pattern, "el")).toBe("path/to/backup.el.xlf");
            expect(resolveGraveyardPath(pattern, "en-US")).toBe("path/to/backup.en-US.xlf");
        });

        it("should handle multiple placeholders", () => {
            const pattern = "{locale}/messages.{locale}.xlf";
            expect(resolveGraveyardPath(pattern, "de")).toBe("de/messages.de.xlf");
        });
    });

    describe("preparePlans integration", () => {
        beforeEach(async () => {
            await mkdir(TEST_DIR, { recursive: true });
        });

        afterEach(async () => {
            await rm(TEST_DIR, { recursive: true, force: true });
        });

        it("should prepare plans for XLIFF 1.2", async () => {
            const sourcePath = join(TEST_DIR, "messages.xlf");
            const localePath = join(TEST_DIR, "messages.de.xlf");

            const sourceXml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" datatype="plaintext">
    <body>
      <trans-unit id="h">
        <source>Hello</source>
      </trans-unit>
    </body>
  </file>
</xliff>`;

            const localeXml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="de" datatype="plaintext">
    <body>
      <trans-unit id="h">
        <source>Hello</source>
        <target>Hallo</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

            await writeFile(sourcePath, sourceXml);
            await writeFile(localePath, localeXml);

            const opts: SyncOptions = {
                source: sourcePath,
                locales: "",
                dryRun: false,
                newTarget: "todo",
                obsolete: "mark",
                failOnMissing: false,
                graveyardFile: "",
            };

            const plans = await preparePlans({
                sourcePath,
                localeFiles: [{ locale: "de", filePath: localePath }]
            }, opts);

            expect(plans).toHaveLength(1);
            expect(plans[0].stats.locale).toBe("de");
            expect(plans[0].stats.missingTargets).toBe(0);
            expect(plans[0].mainOutputXml).toContain("<target>Hallo</target>");
        });

        it("should handle graveyard strategy", async () => {
            const sourcePath = join(TEST_DIR, "messages.xlf");
            const localePath = join(TEST_DIR, "messages.fr.xlf");

            // Source has one key
            const sourceXml = `<xliff version="1.2"><file><body><trans-unit id="new"><source>New</source></trans-unit></body></file></xliff>`;
            // Locale has two keys (one new, one obsolete)
            const localeXml = `<xliff version="1.2"><file><body>
                <trans-unit id="new"><source>New</source><target>Nouveau</target></trans-unit>
                <trans-unit id="old"><source>Old</source><target>Vieux</target></trans-unit>
            </body></file></xliff>`;

            await writeFile(sourcePath, sourceXml);
            await writeFile(localePath, localeXml);

            const opts: SyncOptions = {
                source: sourcePath,
                locales: "",
                dryRun: false,
                newTarget: "todo",
                obsolete: "graveyard",
                failOnMissing: false,
                graveyardFile: join(TEST_DIR, "grave.{locale}.xlf").replace(/\\/g, "/"),
            };

            const plans = await preparePlans({
                sourcePath,
                localeFiles: [{ locale: "fr", filePath: localePath }]
            }, opts);

            expect(plans[0].stats.obsolete).toBe(1);
            expect(plans[0].graveyardOutputXml).toBeDefined();
            expect(plans[0].graveyardPath).toContain("grave.fr.xlf");
            expect(plans[0].graveyardOutputXml).toContain('state="obsolete"');
            expect(plans[0].graveyardOutputXml).toContain('Vieux');
        });
    });
});
