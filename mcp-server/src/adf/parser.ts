import fs from "fs/promises";
import path from "path";

// Types matching the ADF specification slightly adapted for our internal model
export interface AdfTask {
    title: string;
    status: "pending" | "in_progress" | "blocked" | "done";
    source_id: string; // file_path:line_number or file_path:header
    description?: string;
    priority?: "P1" | "P2" | "P3";
}

export interface AdfStatus {
    current_status: string; // The main status line
    blockers: string[];
}

export async function parseStatusMd(filePath: string): Promise<AdfStatus> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        // Extract status from "Current Status" or similar header, or just first line if simple
        // Simple heuristic: Look for lines starting with "Status:" or headers

        // For now, let's extract the first non-empty line as status if no specific format
        // Real ADF might have strict sections.

        let current_status = "Active";
        const blockers: string[] = [];

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
                } else if (trimmed.startsWith("#")) {
                    inBlockers = false;
                }
            }
        }

        return { current_status, blockers };
    } catch (e) {
        return { current_status: "Unknown", blockers: [] };
    }
}

export async function parseTasksMd(filePath: string): Promise<AdfTask[]> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n");
        const tasks: AdfTask[] = [];

        // Track if we are in a table
        let inTable = false;
        let tableHeader: string[] = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();

            // 1. Handle Checkboxes (Standard List)
            const checkboxMatch = trimmed.match(/^- \[(x| )\] (.*)/);
            if (checkboxMatch) {
                const isChecked = checkboxMatch[1] === "x";
                let text = checkboxMatch[2];
                let status: AdfTask["status"] = isChecked ? "done" : "pending";

                const prioMatch = text.match(/\((P[1-3])\)/);
                let priority: AdfTask["priority"] = "P2";
                if (prioMatch) {
                    priority = prioMatch[1] as any;
                    text = text.replace(/\(P[1-3]\)/, "").trim();
                }

                text = text.replace(/<!--.*?-->/g, "").trim();

                tasks.push({
                    title: text,
                    status,
                    source_id: `${filePath}:${index + 1}`,
                    priority
                });
                return;
            }

            // 2. Handle Markdown Tables
            if (trimmed.startsWith("|") && trimmed.includes("|")) {
                const parts = trimmed.split("|").map(p => p.trim()).filter((p, i, a) => i > 0 && i < a.length - 1);

                if (trimmed.includes("---")) {
                    // Separator line
                    return;
                }

                if (!inTable) {
                    // Assume first line is header if it contains "Task" or "Status"
                    if (parts.some(p => p.toLowerCase().includes("task") || p.toLowerCase().includes("status"))) {
                        inTable = true;
                        tableHeader = parts.map(p => p.toLowerCase());
                        return;
                    }
                }

                if (inTable) {
                    const taskIndex = tableHeader.findIndex(h => h.includes("task") || h === "item");
                    const statusIndex = tableHeader.findIndex(h => h.includes("status"));
                    const idIndex = tableHeader.findIndex(h => h === "id");

                    if (taskIndex !== -1) {
                        const title = parts[taskIndex];
                        const rawStatus = statusIndex !== -1 ? parts[statusIndex].toLowerCase() : "pending";
                        const id = idIndex !== -1 ? parts[idIndex] : `${index + 1}`;

                        let status: AdfTask["status"] = "pending";
                        if (rawStatus.includes("done") || rawStatus.includes("complete") || rawStatus === "x") status = "done";
                        else if (rawStatus.includes("progress")) status = "in_progress";
                        else if (rawStatus.includes("block")) status = "blocked";

                        tasks.push({
                            title,
                            status,
                            source_id: `${filePath}:${id}`,
                            priority: "P2" // Default for table items unless we see a prio column
                        });
                    }
                }
            } else {
                inTable = false;
            }
        });

        return tasks;
    } catch (e) {
        console.warn(`Failed to parse ${filePath}`, e);
        return [];
    }
}

export async function parseBacklogMd(filePath: string): Promise<AdfTask[]> {
    // Similar to tasks, but maybe table format?
    // Let's assume list format for now or standard markdown table
    // For MVP, treat same as tasks.md list
    return parseTasksMd(filePath);
}
