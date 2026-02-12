const API_BASE = process.env.API_URL || "http://localhost:3005/api";

async function request(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${path} failed: ${body?.error || `${res.status} ${res.statusText}`}`);
  }
  return body;
}

async function main() {
  const listRes = await request("/admin/backlog-items");
  const initialRows = Array.isArray(listRes.data) ? listRes.data : [];
  if (!Array.isArray(initialRows)) throw new Error("GET /admin/backlog-items did not return array");

  const createTitle = `Backlog smoke ${Date.now()}`;
  const createRes = await request("/admin/backlog-items", {
    method: "POST",
    body: JSON.stringify({
      title: createTitle,
      item_type: "Smoke",
      component: "QA",
      priority: "P3",
      status: "Pending",
    }),
  });
  const created = createRes.data;
  if (!created?.id || !created?.backlog_key) throw new Error("POST /admin/backlog-items missing created id/backlog_key");

  const patchRes = await request(`/admin/backlog-items/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "Archived",
      notes: "Smoke test archive",
    }),
  });
  if (patchRes?.data?.status !== "Archived") throw new Error("PATCH /admin/backlog-items/:id did not update status");

  await request(`/admin/backlog-items/${created.id}`, {
    method: "DELETE",
  });

  console.log("Backlog admin smoke passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
