import { describe, it, expect, vi } from "vitest";
import { getBanner } from "../src/ui/banner.js";
import { renderSummaryTable, renderReportTable } from "../src/ui/table.js";
import { ui } from "../src/ui/console.js";

describe("UI Components", () => {
    describe("Banner", () => {
        it("should generate a banner string", () => {
            const banner = getBanner("test");
            expect(banner).toContain("XLF-SYNC");
            expect(banner).toContain("test");
        });
    });

    describe("Tables", () => {
        it("should render summary table without crashing", () => {
            const spy = vi.spyOn(console, "log").mockImplementation(() => { });
            renderSummaryTable([
                {
                    locale: "el",
                    version: "1.2",
                    sourceKeys: 10,
                    localeKeys: 8,
                    added: 2,
                    obsolete: 1,
                    missingTargets: 3,
                },
            ]);
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it("should render report table without crashing", () => {
            const spy = vi.spyOn(console, "log").mockImplementation(() => { });
            renderReportTable([
                {
                    locale: "fr",
                    version: "2.0",
                    total: 100,
                    done: 85,
                    todo: 15,
                    coverage: 85.0,
                    words: 1200,
                },
            ]);
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    describe("Console UI", () => {
        it("should call console methods", () => {
            const logSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });

            ui.info("info");
            ui.success("success");
            ui.warn("warn");
            ui.error("error");

            expect(logSpy).toHaveBeenCalledTimes(2);
            expect(warnSpy).toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();

            logSpy.mockRestore();
            warnSpy.mockRestore();
            errorSpy.mockRestore();
        });
    });
});
