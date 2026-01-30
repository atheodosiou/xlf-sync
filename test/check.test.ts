import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getCheckFailureReasons, performCheck } from "../src/commands/check.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_DIR = join(process.cwd(), "test-temp-check");

describe("Check Logic", () => {
    describe("getCheckFailureReasons", () => {
        const noStats = { hasMissing: false, hasObsolete: false, hasAdded: false };
        const allStats = { hasMissing: true, hasObsolete: true, hasAdded: true };

        it("should return no reasons if no flags are set", () => {
            const opts = { failOnMissing: false, failOnObsolete: false, failOnAdded: false };
            expect(getCheckFailureReasons(allStats, opts)).toEqual([]);
        });

        it("should return missing targets if flag is set", () => {
            const opts = { failOnMissing: true, failOnObsolete: false, failOnAdded: false };
            expect(getCheckFailureReasons(allStats, opts)).toEqual(["missing targets"]);
            expect(getCheckFailureReasons(noStats, opts)).toEqual([]);
        });

        it("should return obsolete keys if flag is set", () => {
            const opts = { failOnMissing: false, failOnObsolete: true, failOnAdded: false };
            expect(getCheckFailureReasons(allStats, opts)).toEqual(["obsolete keys"]);
            expect(getCheckFailureReasons(noStats, opts)).toEqual([]);
        });

        it("should return new keys if flag is set", () => {
            const opts = { failOnMissing: false, failOnObsolete: false, failOnAdded: true };
            expect(getCheckFailureReasons(allStats, opts)).toEqual(["new keys need adding"]);
            expect(getCheckFailureReasons(noStats, opts)).toEqual([]);
        });

        it("should return multiple reasons", () => {
            const opts = { failOnMissing: true, failOnObsolete: true, failOnAdded: true };
            expect(getCheckFailureReasons(allStats, opts)).toEqual([
                "missing targets",
                "obsolete keys",
                "new keys need adding"
            ]);
        });
    });

    describe("performCheck integration", () => {
        beforeEach(async () => {
            await mkdir(TEST_DIR, { recursive: true });
        });

        afterEach(async () => {
            await rm(TEST_DIR, { recursive: true, force: true });
        });

        it("should detect all types of sync issues", async () => {
            const sourcePath = join(TEST_DIR, "messages.xlf");
            const localePath = join(TEST_DIR, "messages.el.xlf");

            // Source: h, n
            const sourceXml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="1.2">
  <file source-language="en" datatype="plaintext">
    <body>
      <trans-unit id="h"><source>H</source></trans-unit>
      <trans-unit id="n"><source>N</source></trans-unit>
    </body>
  </file>
</xliff>`;

            // Locale: h (translated), o (obsolete)
            // Missing: n
            // Added: n
            const localeXml = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="1.2">
  <file source-language="en" target-language="el" datatype="plaintext">
    <body>
      <trans-unit id="h"><source>H</source><target>Γ</target></trans-unit>
      <trans-unit id="o"><source>O</source><target>Π</target></trans-unit>
    </body>
  </file>
</xliff>`;

            await writeFile(sourcePath, sourceXml);
            await writeFile(localePath, localeXml);

            const result = await performCheck(
                { sourcePath, localeFiles: [{ locale: "el", filePath: localePath }] },
                { newTarget: "todo" }
            );

            expect(result.hasMissing).toBe(true);
            expect(result.hasObsolete).toBe(true);
            expect(result.hasAdded).toBe(true);
            expect(result.rows[0].missingTargets).toBe(1); // 'n' is missing target
            expect(result.rows[0].obsolete).toBe(1); // 'o' is obsolete
            expect(result.rows[0].added).toBe(1); // 'n' is new
            expect(result.missingKeysByLocale["el"]).toEqual(["n"]);
        });
    });
});
