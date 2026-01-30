import { describe, it, expect } from "vitest";
import { getCheckFailureReasons } from "../src/commands/check.js";

describe("Check Command Logic", () => {
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
});
