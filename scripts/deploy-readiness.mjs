import path from "node:path";
import process from "node:process";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const OPTIONAL_ENV = ["API_URL", "NEXT_PUBLIC_APP_URL", "MCP_PORT"];

async function loadEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Ignore missing env files.
  }
}

async function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd || ROOT,
      env: process.env,
      stdio: "inherit",
      shell: false,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function checkPathExists(relPath) {
  await fs.access(path.join(ROOT, relPath));
}

async function checkMigrations() {
  const migrationDir = path.join(ROOT, "supabase", "migrations");
  const files = await fs.readdir(migrationDir);
  const sqlFiles = files.filter((f) => f.endsWith(".sql"));
  if (sqlFiles.length === 0) {
    throw new Error("No Supabase migration SQL files found.");
  }
  return sqlFiles.length;
}

async function checkApiReachability() {
  const base = process.env.API_URL || "http://localhost:3005/api";
  const url = `${base.replace(/\/$/, "")}/projects?status=active&scope=enabled`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API reachability check failed: ${res.status} ${res.statusText} (${url})`);
  }
  const body = await res.json();
  if (!body || !("data" in body)) {
    throw new Error(`API response missing data envelope (${url})`);
  }
}

async function main() {
  await loadEnvFile(path.join(ROOT, ".env.local"));
  await loadEnvFile(path.join(ROOT, ".env"));

  const missingRequired = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missingRequired.length > 0) {
    throw new Error(`Missing required env vars: ${missingRequired.join(", ")}`);
  }

  console.log("Deploy readiness: environment variables");
  for (const key of REQUIRED_ENV) console.log(`  PASS ${key}`);
  for (const key of OPTIONAL_ENV) console.log(`  INFO ${key}=${process.env[key] ? "set" : "not set"}`);

  console.log("Deploy readiness: repository prerequisites");
  await checkPathExists("supabase/config.toml");
  await checkPathExists("supabase/seed.sql");
  await checkPathExists("mcp-server/package.json");
  const migrationCount = await checkMigrations();
  console.log(`  PASS Supabase migrations: ${migrationCount} files`);

  console.log("Deploy readiness: API reachability");
  await checkApiReachability();
  console.log("  PASS API reachable");

  console.log("Deploy readiness: validation gates");
  await runCommand("npm", ["run", "build"]);
  await runCommand("npm", ["run", "test:api-contract"]);
  await runCommand("npm", ["run", "smoke:contract"], { cwd: path.join(ROOT, "mcp-server") });
  await runCommand("npm", ["run", "smoke:e2e"], { cwd: path.join(ROOT, "mcp-server") });
  await runCommand("npm", ["run", "test:adf-sync"]);

  console.log("Deploy readiness PASS");
  console.log("Next: execute production migration + Vercel rollout per runbook.");
}

main().catch((error) => {
  console.error(`Deploy readiness FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
