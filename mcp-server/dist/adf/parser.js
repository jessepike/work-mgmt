"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStatusMd = parseStatusMd;
exports.parseTasksMd = parseTasksMd;
exports.parseBacklogMd = parseBacklogMd;
const promises_1 = __importDefault(require("fs/promises"));
function slugify(input) {
    return input
        .toLowerCase()
        .replace(/<[^>]+>/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}
function normalizeSourceToken(raw) {
    return raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._:-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function buildStableSourceId(filePath, section, title, explicitId, seen) {
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
function parsePriority(text) {
    const match = text.match(/\((P[1-3])\)/i) || text.match(/\b(P[1-3])\b/i);
    if (!match)
        return { cleanedText: text };
    const priority = match[1].toUpperCase();
    const cleanedText = text.replace(match[0], "").replace(/\s{2,}/g, " ").trim();
    return { cleanedText, priority };
}
function extractInlineId(text) {
    const commentId = text.match(/<!--\s*id\s*:\s*([a-zA-Z0-9._:-]+)\s*-->/i);
    if (commentId)
        return commentId[1];
    const tokenId = text.match(/\b(?:id|source_id)\s*[:=]\s*([a-zA-Z0-9._:-]+)/i);
    if (tokenId)
        return tokenId[1];
    return null;
}
function mapTaskStatus(rawStatus) {
    const s = rawStatus.toLowerCase();
    if (s.includes("done") || s.includes("complete") || s === "x")
        return "done";
    if (s.includes("progress") || s.includes("doing") || s.includes("active"))
        return "in_progress";
    if (s.includes("block"))
        return "blocked";
    return "pending";
}
function mapBacklogStatus(rawStatus, currentSection) {
    const s = rawStatus.toLowerCase();
    const section = currentSection.toLowerCase();
    if (s.includes("archive"))
        return "archived";
    if (s.includes("promot"))
        return "promoted";
    if (s.includes("priorit"))
        return "prioritized";
    if (s.includes("triage"))
        return "triaged";
    if (s.includes("captur") || s.includes("queue"))
        return "captured";
    if (section.includes("archive"))
        return "archived";
    if (section.includes("promot"))
        return "promoted";
    if (section.includes("priorit"))
        return "prioritized";
    if (section.includes("triage"))
        return "triaged";
    return "captured";
}
async function parseStatusMd(filePath) {
    try {
        const content = await promises_1.default.readFile(filePath, "utf-8");
        let current_status = "Active";
        const blockers = [];
        const pending_decisions = [];
        let focus;
        let section = "none";
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const keyValueMatch = trimmed.match(/^(current_status|status|focus)\s*:\s*(.+)$/i);
            if (keyValueMatch) {
                const key = keyValueMatch[1].toLowerCase();
                const value = keyValueMatch[2].trim();
                if (key === "focus")
                    focus = value;
                else
                    current_status = value;
                continue;
            }
            const headingMatch = trimmed.match(/^#+\s*(.+)$/);
            if (headingMatch) {
                const heading = headingMatch[1].toLowerCase();
                if (heading.includes("current status") || heading === "status")
                    section = "status";
                else if (heading.includes("blocker"))
                    section = "blockers";
                else if (heading.includes("pending decision"))
                    section = "pending_decisions";
                else if (heading === "focus" || heading.includes("current focus"))
                    section = "focus";
                else
                    section = "none";
                continue;
            }
            if (!trimmed)
                continue;
            if (section === "status") {
                if (!trimmed.startsWith("- ")) {
                    current_status = trimmed.replace(/^[-*]\s*/, "").trim();
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
        return { current_status, blockers, pending_decisions, focus };
    }
    catch (e) {
        return { current_status: "Unknown", blockers: [], pending_decisions: [] };
    }
}
async function parseTasksMd(filePath) {
    try {
        const content = await promises_1.default.readFile(filePath, "utf-8");
        const lines = content.split("\n");
        const tasks = [];
        const seen = new Map();
        let currentSection = "tasks";
        // Track if we are in a table
        let inTable = false;
        let tableHeader = [];
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
                let status = isChecked ? "done" : "pending";
                const explicitId = extractInlineId(text);
                const prio = parsePriority(text);
                text = prio.cleanedText;
                const priority = prio.priority || "P2";
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
            }
            else {
                inTable = false;
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
    try {
        const content = await promises_1.default.readFile(filePath, "utf-8");
        const lines = content.split("\n");
        const backlog = [];
        const seen = new Map();
        let currentSection = "backlog";
        let inTable = false;
        let tableHeader = [];
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
                if (trimmed.includes("---"))
                    return;
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
            }
            else {
                inTable = false;
            }
        });
        return backlog;
    }
    catch (e) {
        console.warn(`Failed to parse ${filePath}`, e);
        return [];
    }
}
