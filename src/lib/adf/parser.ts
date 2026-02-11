import fs from "fs/promises";

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
    current_stage?: string;
    blockers: string[];
    pending_decisions: string[];
    focus?: string;
}

const ADF_STAGE_KEYWORDS = [
    "discover",
    "design",
    "develop",
    "development",
    "build",
    "validate",
    "deliver",
    "operate",
    "improve",
] as const;

function toTitle(input: string): string {
    return input
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

function normalizeStage(raw: string): string | null {
    const cleaned = stripWrappingQuotes(raw);
    const lower = cleaned.toLowerCase();
    for (const key of ADF_STAGE_KEYWORDS) {
        if (lower.includes(key)) {
            if (key === "development") return "Develop";
            return toTitle(key);
        }
    }
    return null;
}

function stripWrappingQuotes(value: string): string {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
}

export interface AdfBacklogItem {
    title: string;
    source_id: string;
    description?: string;
    priority?: "P1" | "P2" | "P3";
    status: "captured" | "triaged" | "prioritized" | "promoted" | "archived";
}

function slugify(input: string): string {
    return input
        .toLowerCase()
        .replace(/<[^>]+>/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}

function normalizeSourceToken(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._:-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function buildStableSourceId(
    filePath: string,
    section: string,
    title: string,
    explicitId: string | null,
    seen: Map<string, number>
): string {
    if (explicitId) {
        return `${filePath}:id:${normalizeSourceToken(explicitId)}`;
    }

    const sectionSlug = slugify(section || "section") || "section";
    const titleSlug = slugify(title || "item") || "item";
    const key = `${sectionSlug}:${titleSlug}`;
    const seq = (seen.get(key) || 0) + 1;
    seen.set(key, seq);

    return `${filePath}:slug:${key}${seq > 1 ? `:${seq}` : ""}`;
}

function parsePriority(text: string): { cleanedText: string; priority?: "P1" | "P2" | "P3" } {
    const match = text.match(/\((P[1-3])\)/i) || text.match(/\b(P[1-3])\b/i);
    if (!match) return { cleanedText: text };
    const priority = match[1].toUpperCase() as "P1" | "P2" | "P3";
    const cleanedText = text.replace(match[0], "").replace(/\s{2,}/g, " ").trim();
    return { cleanedText, priority };
}

function extractInlineId(text: string): string | null {
    const commentId = text.match(/<!--\s*id\s*:\s*([a-zA-Z0-9._:-]+)\s*-->/i);
    if (commentId) return commentId[1];
    const tokenId = text.match(/\b(?:id|source_id)\s*[:=]\s*([a-zA-Z0-9._:-]+)/i);
    if (tokenId) return tokenId[1];
    return null;
}

function mapTaskStatus(rawStatus: string): AdfTask["status"] {
    const s = rawStatus.toLowerCase();
    if (s.includes("done") || s.includes("complete") || s === "x") return "done";
    if (s.includes("progress") || s.includes("doing") || s.includes("active")) return "in_progress";
    if (s.includes("block")) return "blocked";
    return "pending";
}

function mapBacklogStatus(rawStatus: string, currentSection: string): AdfBacklogItem["status"] {
    const s = rawStatus.toLowerCase();
    const section = currentSection.toLowerCase();

    if (s.includes("archive")) return "archived";
    if (s.includes("promot")) return "promoted";
    if (s.includes("priorit")) return "prioritized";
    if (s.includes("triage")) return "triaged";
    if (s.includes("captur") || s.includes("queue")) return "captured";

    if (section.includes("archive")) return "archived";
    if (section.includes("promot")) return "promoted";
    if (section.includes("priorit")) return "prioritized";
    if (section.includes("triage")) return "triaged";

    return "captured";
}

export async function parseStatusMd(filePath: string): Promise<AdfStatus> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        let current_status = "Unknown";
        let current_stage: string | undefined;
        const blockers: string[] = [];
        const pending_decisions: string[] = [];
        let focus: string | undefined;
        let section: "none" | "status" | "stage" | "blockers" | "pending_decisions" | "focus" = "none";

        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            const keyValueMatch = trimmed.match(/^(current_status|status|current_stage|stage|focus)\s*:\s*(.+)$/i);
            if (keyValueMatch) {
                const key = keyValueMatch[1].toLowerCase();
                const value = stripWrappingQuotes(keyValueMatch[2].trim());
                if (key === "focus") focus = value;
                else if (key === "current_stage" || key === "stage") current_stage = value;
                else current_status = value;
                continue;
            }

            const headingMatch = trimmed.match(/^#+\s*(.+)$/);
            if (headingMatch) {
                const heading = headingMatch[1].toLowerCase();
                if (heading.includes("current status") || heading === "status") section = "status";
                else if (heading.includes("current stage") || heading === "stage") section = "stage";
                else if (heading.includes("blocker")) section = "blockers";
                else if (heading.includes("pending decision")) section = "pending_decisions";
                else if (heading === "focus" || heading.includes("current focus")) section = "focus";
                else section = "none";
                continue;
            }

            if (!trimmed) continue;

            if (section === "status") {
                if (!trimmed.startsWith("- ")) {
                    current_status = stripWrappingQuotes(trimmed.replace(/^[-*]\s*/, "").trim());
                    section = "none";
                }
                continue;
            }

            if (section === "stage") {
                if (!trimmed.startsWith("- ")) {
                    current_stage = stripWrappingQuotes(trimmed.replace(/^[-*]\s*/, "").trim());
                    section = "none";
                }
                continue;
            }

            if (section === "focus" && !focus) {
                focus = trimmed.replace(/^[-*]\s*/, "").trim();
                section = "none";
                continue;
            }

            if (section === "blockers") {
                if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]") || trimmed.startsWith("- ")) {
                    blockers.push(trimmed.replace(/^-\s*(\[[x ]\]\s*)?/, ""));
                }
                continue;
            }

            if (section === "pending_decisions") {
                if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]") || trimmed.startsWith("- ")) {
                    pending_decisions.push(trimmed.replace(/^-\s*(\[[x ]\]\s*)?/, ""));
                }
                continue;
            }
        }

        const normalizedFromStatus = normalizeStage(current_status);
        const normalizedFromStage = current_stage ? normalizeStage(current_stage) : null;
        return {
            current_status,
            current_stage: normalizedFromStage || normalizedFromStatus || current_stage,
            blockers,
            pending_decisions,
            focus
        };
    } catch (e) {
        return { current_status: "Unknown", blockers: [], pending_decisions: [] };
    }
}

export async function parseIntentMdSummary(filePath: string): Promise<string | null> {
    try {
        const content = await fs.readFile(filePath, "utf-8").then((raw) => raw.replace(/\r/g, ""));
        const lines = content.split("\n");
        let inFrontmatter = false;

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            if (line === "---") {
                inFrontmatter = !inFrontmatter;
                continue;
            }
            if (inFrontmatter) continue;
            if (line.startsWith("#")) continue;

            const cleaned = line.replace(/^[-*]\s+/, "").trim();
            if (/^[a-z0-9_]+\s*:/i.test(cleaned)) continue;
            if (cleaned.length >= 24) return cleaned.slice(0, 220);
        }
        return null;
    } catch {
        return null;
    }
}

export async function parseTasksMd(filePath: string): Promise<AdfTask[]> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n");
        const tasks: AdfTask[] = [];
        const seen = new Map<string, number>();
        let currentSection = "tasks";

        // Track if we are in a table
        let inTable = false;
        let tableHeader: string[] = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            const heading = trimmed.match(/^#+\s+(.*)$/);
            if (heading) {
                currentSection = heading[1];
            }

            // 1. Handle Checkboxes (Standard List)
            const checkboxMatch = trimmed.match(/^- \[(x| )\] (.*)/);
            if (checkboxMatch) {
                const isChecked = checkboxMatch[1] === "x";
                let text = checkboxMatch[2];
                let status: AdfTask["status"] = isChecked ? "done" : "pending";

                const explicitId = extractInlineId(text);
                const prio = parsePriority(text);
                text = prio.cleanedText;
                const priority: AdfTask["priority"] = prio.priority || "P2";

                if (!isChecked) {
                    status = mapTaskStatus(text);
                }

                text = text.replace(/<!--.*?-->/g, "").trim();

                tasks.push({
                    title: text,
                    status,
                    source_id: buildStableSourceId(filePath, currentSection, text, explicitId, seen),
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
                    const priorityIndex = tableHeader.findIndex(h => h.includes("priority") || h === "pri");

                    if (taskIndex !== -1) {
                        const titleRaw = parts[taskIndex];
                        const titlePrio = parsePriority(titleRaw);
                        const title = titlePrio.cleanedText;
                        const rawStatus = statusIndex !== -1 ? parts[statusIndex].toLowerCase() : "pending";
                        const id = idIndex !== -1 ? parts[idIndex] : null;
                        const columnPriority = priorityIndex !== -1 ? parsePriority(parts[priorityIndex]).priority : undefined;
                        const priority = columnPriority || titlePrio.priority || "P2";

                        tasks.push({
                            title,
                            status: mapTaskStatus(rawStatus),
                            source_id: buildStableSourceId(filePath, currentSection, title, id, seen),
                            priority
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

export async function parseBacklogMd(filePath: string): Promise<AdfBacklogItem[]> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n");
        const backlog: AdfBacklogItem[] = [];
        const seen = new Map<string, number>();
        let currentSection = "backlog";

        let inTable = false;
        let tableHeader: string[] = [];

        lines.forEach((line) => {
            const trimmed = line.trim();
            const heading = trimmed.match(/^#+\s+(.*)$/);
            if (heading) {
                currentSection = heading[1];
            }

            const checkboxMatch = trimmed.match(/^- \[(x| )\] (.*)/);
            if (checkboxMatch) {
                let text = checkboxMatch[2].replace(/<!--.*?-->/g, "").trim();
                const explicitId = extractInlineId(text);
                const prio = parsePriority(text);
                text = prio.cleanedText;
                const status = checkboxMatch[1] === "x"
                    ? "archived"
                    : mapBacklogStatus(text, currentSection);

                backlog.push({
                    title: text,
                    source_id: buildStableSourceId(filePath, currentSection, text, explicitId, seen),
                    priority: prio.priority || "P2",
                    status
                });
                return;
            }

            if (trimmed.startsWith("|") && trimmed.includes("|")) {
                const parts = trimmed.split("|").map(p => p.trim()).filter((p, i, a) => i > 0 && i < a.length - 1);

                if (trimmed.includes("---")) return;

                if (!inTable) {
                    if (parts.some(p => p.toLowerCase().includes("item") || p.toLowerCase().includes("task") || p.toLowerCase().includes("status"))) {
                        inTable = true;
                        tableHeader = parts.map(p => p.toLowerCase());
                        return;
                    }
                }

                if (inTable) {
                    const titleIndex = tableHeader.findIndex(h => h.includes("task") || h.includes("item") || h.includes("title"));
                    const statusIndex = tableHeader.findIndex(h => h.includes("status"));
                    const idIndex = tableHeader.findIndex(h => h === "id");
                    const priorityIndex = tableHeader.findIndex(h => h.includes("priority") || h === "pri");
                    const descriptionIndex = tableHeader.findIndex(h => h.includes("description") || h === "notes");

                    if (titleIndex !== -1) {
                        const titleRaw = parts[titleIndex];
                        const titlePrio = parsePriority(titleRaw);
                        const rawStatus = statusIndex !== -1 ? parts[statusIndex] : "";
                        const explicitId = idIndex !== -1 ? parts[idIndex] : null;
                        const columnPriority = priorityIndex !== -1 ? parsePriority(parts[priorityIndex]).priority : undefined;
                        const description = descriptionIndex !== -1 ? parts[descriptionIndex] : undefined;

                        backlog.push({
                            title: titlePrio.cleanedText,
                            source_id: buildStableSourceId(filePath, currentSection, titlePrio.cleanedText, explicitId, seen),
                            description,
                            priority: columnPriority || titlePrio.priority || "P2",
                            status: mapBacklogStatus(rawStatus, currentSection)
                        });
                    }
                }
            } else {
                inTable = false;
            }
        });

        return backlog;
    } catch (e) {
        console.warn(`Failed to parse ${filePath}`, e);
        return [];
    }
}
