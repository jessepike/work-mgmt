import process from "node:process";

const API_URL = process.env.API_URL || "http://localhost:3005/api";
const API_SECRET = process.env.API_SECRET;

function authHeaders() {
  return API_SECRET ? { authorization: `Bearer ${API_SECRET}` } : {};
}

async function api(path, init = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...authHeaders(),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  console.log(`Writeback smoke against ${API_URL}`);

  const connectorsRes = await api("/connectors?connector_type=adf");
  if (!connectorsRes.ok) throw new Error(`connectors fetch failed: ${connectorsRes.status}`);
  const connectors = (connectorsRes.body?.data || []).filter((c) => c.status === "active" && c?.config?.path);
  const connector = connectors[0];
  if (!connector) {
    console.log("SKIPPED: no active adf connectors with path");
    return;
  }

  const dryRunStatus = await api("/connectors/writeback", {
    method: "POST",
    body: JSON.stringify({
      project_id: connector.project_id,
      dry_run: true,
      operations: [
        {
          entity_type: "project_status",
          patch: { focus: "Writeback smoke dry-run check" },
        },
      ],
    }),
  });

  if (!dryRunStatus.ok) {
    throw new Error(`writeback dry-run failed: ${dryRunStatus.status} ${JSON.stringify(dryRunStatus.body)}`);
  }

  console.log("PASS: writeback dry-run endpoint responded with success");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
