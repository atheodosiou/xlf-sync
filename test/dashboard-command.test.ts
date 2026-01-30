import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { registerDashboardCommand } from "../src/commands/dashboard.js";
import * as discover from "../src/core/discover.js";
import * as report from "../src/commands/report.js";
import * as dashboardGen from "../src/core/dashboard-gen.js";
import * as fs from "node:fs/promises";
import * as config from "../src/core/config.js";

vi.mock("../src/core/discover.js");
vi.mock("../src/commands/report.js");
vi.mock("../src/core/dashboard-gen.js");
vi.mock("node:fs/promises");
vi.mock("../src/core/config.js");
vi.mock("../src/core/xlf/index.js");
vi.mock("../src/core/sync.js");
vi.mock("../src/ui/banner.js", () => ({ renderBanner: vi.fn() }));

import { parseXlf } from "../src/core/xlf/index.js";
import { isUntranslated } from "../src/core/sync.js";

describe("Dashboard Command", () => {
    let program: Command;

    beforeEach(() => {
        vi.clearAllMocks();
        program = new Command();
        registerDashboardCommand(program);
    });

    it("should successfully generate a dashboard", async () => {
        const mockFiles = {
            localeFiles: [
                { locale: "el", filePath: "messages.el.xlf" }
            ],
            sourcePath: "messages.xlf"
        };

        vi.mocked(config.loadConfig).mockResolvedValue({});
        vi.mocked(fs.readFile).mockResolvedValue("xml content");
        vi.mocked(parseXlf).mockReturnValue({
            version: "1.2",
            entries: new Map([["k1", { targetXml: "T" }]])
        } as any);
        vi.mocked(isUntranslated).mockReturnValue(false);
        vi.mocked(discover.discoverFiles).mockResolvedValue(mockFiles as any);
        vi.mocked(report.performReport).mockResolvedValue([
            { locale: "el", version: "1.2", total: 1, done: 1, todo: 0, coverage: 100, words: 1 }
        ]);
        vi.mocked(dashboardGen.generateDashboardHtml).mockReturnValue("<html></html>");
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);

        await program.parseAsync(["node", "test", "dashboard", "--out", "test.html"]);

        expect(discover.discoverFiles).toHaveBeenCalled();
        expect(report.performReport).toHaveBeenCalled();
        expect(dashboardGen.generateDashboardHtml).toHaveBeenCalled();
        expect(fs.writeFile).toHaveBeenCalledWith("test.html", "<html></html>", "utf-8");
    });

    it("should handle failures gracefully", async () => {
        vi.mocked(config.loadConfig).mockResolvedValue({});
        vi.mocked(discover.discoverFiles).mockRejectedValue(new Error("Discovery failed"));

        await program.parseAsync(["node", "test", "dashboard"]);

        expect(process.exitCode).toBe(1);
        process.exitCode = undefined; // reset
    });
});
