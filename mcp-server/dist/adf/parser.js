"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStatusMd = parseStatusMd;
exports.parseTasksMd = parseTasksMd;
exports.parseBacklogMd = parseBacklogMd;
const promises_1 = __importDefault(require("fs/promises"));
async function parseStatusMd(filePath) {
    try {
        const content = await promises_1.default.readFile(filePath, "utf-8");
        // Extract status from "Current Status" or similar header, or just first line if simple
        // Simple heuristic: Look for lines starting with "Status:" or headers
        // For now, let's extract the first non-empty line as status if no specific format
        // Real ADF might have strict sections.
        let current_status = "Active";
        const blockers = [];
        // Check for "Blockers" or "Blocking Issues"
        const lines = content.split("\n");
        let inBlockers = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.match(/^#+\s*Current Status/i)) {
                // Next line might be status
                continue;
            }
            if (trimmed.match(/^#+\s*Blockers/i)) {
                inBlockers = true;
                continue;
            }
            if (inBlockers) {
                if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- ")) {
                    blockers.push(trimmed.replace(/^-\s*(\[ \]\s*)?/, ""));
                }
                else if (trimmed.startsWith("#")) {
                    inBlockers = false;
                }
            }
        }
        return { current_status, blockers };
    }
    catch (e) {
        return { current_status: "Unknown", blockers: [] };
    }
}
async function parseTasksMd(filePath) {
    try {
        const content = await promises_1.default.readFile(filePath, "utf-8");
        const lines = content.split("\n");
        const tasks = [];
        // Regex for standard checkbox task: - [ ] Task title
        // Extended: - [x] Task title <!-- id: 123 --> (we might ignore ID for now and use content hash or line)
        let priority = "P2"; // Default
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            const checkboxMatch = trimmed.match(/^- \[(x| )\] (.*)/);
            if (checkboxMatch) {
                const isChecked = checkboxMatch[1] === "x";
                let text = checkboxMatch[2];
                let status = isChecked ? "done" : "pending";
                // Extract priority tags if any (e.g. (P1))
                const prioMatch = text.match(/\((P[1-3])\)/);
                if (prioMatch) {
                    priority = prioMatch[1];
                    text = text.replace(/\(P[1-3]\)/, "").trim();
                }
                // Remove HTML comments
                text = text.replace(/<!--.*?-->/g, "").trim();
                tasks.push({
                    title: text,
                    status,
                    source_id: `${filePath}:${index + 1}`,
                    priority
                });
            }
        });
        return tasks;
    }
    catch (e) {
        console.warn(`Failed to parse ${filePath}`, e);
        return [];
    }
}
async function parseBacklogMd(filePath) {
    // Similar to tasks, but maybe table format?
    // Let's assume list format for now or standard markdown table
    // For MVP, treat same as tasks.md list
    return parseTasksMd(filePath);
}
