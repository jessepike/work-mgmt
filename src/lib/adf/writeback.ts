import fs from "fs/promises";
import path from "path";

type Locator = {
  filePath: string;
  mode: "id" | "slug";
  token: string;
};

export type WritebackPatch = {
  status?: string;
  priority?: "P1" | "P2" | "P3" | null;
  title?: string;
  description?: string | null;
  current_stage?: string | null;
  focus?: string | null;
};

export type WritebackPreview = {
  file_path: string;
  line: number;
  before: string;
  after: string;
};

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseSourceId(sourceId: string, projectPath: string): Locator {
  const match = sourceId.match(/^(.*?):(id|slug):(.*)$/);
  if (!match) throw new Error(`Unsupported source_id format: ${sourceId}`);
  const rawPath = match[1];
  const mode = match[2] as "id" | "slug";
  const token = match[3];
  const filePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(projectPath, rawPath);
  return { filePath, mode, token };
}

function locateLine(lines: string[], locator: Locator): number {
  if (locator.mode === "id") {
    const token = escapeRegExp(locator.token);
    const patterns = [
      new RegExp(`<!--\\s*id\\s*:\\s*${token}\\s*-->`, "i"),
      new RegExp(`\\b(?:id|source_id)\\s*[:=]\\s*${token}\\b`, "i"),
      new RegExp(`\\|\\s*${token}\\s*\\|`),
    ];
    for (let i = 0; i < lines.length; i += 1) {
      if (patterns.some((p) => p.test(lines[i]))) return i;
    }
    return -1;
  }

  // slug mode fallback: best effort by slug-match on markdown content lines.
  for (let i = 0; i < lines.length; i += 1) {
    const normalized = slugify(lines[i]);
    if (!normalized) continue;
    if (locator.token.includes(normalized) || normalized.includes(locator.token)) return i;
  }
  return -1;
}

function toTableRow(line: string): string[] | null {
  if (!line.trim().startsWith("|")) return null;
  const cells = line.split("|").slice(1, -1).map((c) => c.trim());
  return cells.length > 0 ? cells : null;
}

function fromTableRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function tableHeaderContext(lines: string[], rowIdx: number): { headers: string[]; headerLine: number } | null {
  for (let i = rowIdx - 1; i >= 1; i -= 1) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) continue;
    if (line.includes("---")) {
      const headerRow = toTableRow(lines[i - 1] || "");
      if (!headerRow) return null;
      return { headers: headerRow.map((h) => h.toLowerCase()), headerLine: i - 1 };
    }
  }
  return null;
}

function statusText(status: string): string {
  const s = status.toLowerCase();
  if (s === "in_progress") return "in_progress";
  if (s === "blocked") return "blocked";
  if (s === "done") return "done";
  if (s === "archived") return "archived";
  return "pending";
}

function patchCheckboxLine(line: string, patch: WritebackPatch): string {
  const match = line.match(/^(\s*-\s*\[)([ xX])(\]\s*)(.*)$/);
  if (!match) return line;
  const checked = patch.status?.toLowerCase() === "done" || patch.status?.toLowerCase() === "archived";
  const prefix = `${match[1]}${checked ? "x" : " "}${match[3]}`;
  let body = match[4];

  if (patch.title && patch.title.trim()) {
    const idComment = body.match(/<!--\s*id\s*:[^>]+-->/i)?.[0] || "";
    body = `${patch.title.trim()}${idComment ? ` ${idComment}` : ""}`;
  }

  if (patch.priority) {
    if (/\bP[1-3]\b/i.test(body)) {
      body = body.replace(/\bP[1-3]\b/i, patch.priority);
    } else {
      body = `${body} (${patch.priority})`;
    }
  }

  return `${prefix}${body}`.replace(/\s+$/, "");
}

function patchTableLine(line: string, headers: string[], patch: WritebackPatch): string {
  const cells = toTableRow(line);
  if (!cells) return line;

  const idxStatus = headers.findIndex((h) => h.includes("status"));
  const idxTitle = headers.findIndex((h) => h.includes("task") || h.includes("title") || h.includes("item"));
  const idxPriority = headers.findIndex((h) => h.includes("priority") || h === "pri");
  const idxDescription = headers.findIndex((h) => h.includes("description") || h.includes("notes"));

  if (idxStatus >= 0 && patch.status) cells[idxStatus] = statusText(patch.status);
  if (idxTitle >= 0 && patch.title) cells[idxTitle] = patch.title.trim();
  if (idxPriority >= 0 && patch.priority) cells[idxPriority] = patch.priority;
  if (idxDescription >= 0 && typeof patch.description === "string") cells[idxDescription] = patch.description;

  return fromTableRow(cells);
}

export async function applyEntityWriteback(
  sourceId: string,
  projectPath: string,
  patch: WritebackPatch,
  dryRun: boolean
): Promise<WritebackPreview> {
  const locator = parseSourceId(sourceId, projectPath);
  const raw = await fs.readFile(locator.filePath, "utf8");
  const lines = raw.replace(/\r/g, "").split("\n");
  const lineIdx = locateLine(lines, locator);
  if (lineIdx < 0) throw new Error(`Could not locate source_id in file: ${sourceId}`);

  const before = lines[lineIdx];
  let after = before;
  const tableCtx = tableHeaderContext(lines, lineIdx);

  if (tableCtx) {
    after = patchTableLine(before, tableCtx.headers, patch);
  } else {
    after = patchCheckboxLine(before, patch);
  }

  if (after === before) {
    throw new Error(`No writable fields mapped for source_id: ${sourceId}`);
  }

  if (!dryRun) {
    lines[lineIdx] = after;
    await fs.writeFile(locator.filePath, `${lines.join("\n")}\n`, "utf8");
  }

  return {
    file_path: locator.filePath,
    line: lineIdx + 1,
    before,
    after,
  };
}

export async function applyStatusWriteback(
  statusFilePath: string,
  patch: WritebackPatch,
  dryRun: boolean
): Promise<WritebackPreview[]> {
  const raw = await fs.readFile(statusFilePath, "utf8");
  const lines = raw.replace(/\r/g, "").split("\n");
  const previews: WritebackPreview[] = [];

  const upsert = (key: "current_stage" | "focus", value: string | null | undefined) => {
    if (typeof value !== "string" || !value.trim()) return;
    const idx = lines.findIndex((l) => l.trim().toLowerCase().startsWith(`${key}:`));
    const replacement = `${key}: "${value.trim()}"`;
    if (idx >= 0) {
      previews.push({ file_path: statusFilePath, line: idx + 1, before: lines[idx], after: replacement });
      lines[idx] = replacement;
      return;
    }
    lines.push(replacement);
    previews.push({ file_path: statusFilePath, line: lines.length, before: "", after: replacement });
  };

  upsert("current_stage", patch.current_stage);
  upsert("focus", patch.focus);

  if (previews.length === 0) throw new Error("No status fields to write back");
  if (!dryRun) await fs.writeFile(statusFilePath, `${lines.join("\n")}\n`, "utf8");
  return previews;
}
