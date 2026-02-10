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

        // Regex for standard checkbox task: - [ ] Task title
        // Extended: - [x] Task title <!-- id: 123 --> (we might ignore ID for now and use content hash or line)

        let priority: "P1" | "P2" | "P3" = "P2"; // Default

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            const checkboxMatch = trimmed.match(/^- \[(x| )\] (.*)/);

            if (checkboxMatch) {
                const isChecked = checkboxMatch[1] === "x";
                let text = checkboxMatch[2];
                let status: AdfTask["status"] = isChecked ? "done" : "pending";

                // Extract priority tags if any (e.g. (P1))
                const prioMatch = text.match(/\((P[1-3])\)/);
                if (prioMatch) {
                    priority = prioMatch[1] as any;
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
