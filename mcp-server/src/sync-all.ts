import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import { parseTasksMd, parseBacklogMd } from './adf/parser.js';

const API_BASE_URL = "http://localhost:3005/api";

const MAPPINGS = [
    { id: "c1e73937-ebd3-46e4-b51b-25a1e7694b28", path: "/Users/jessepike/code/_shared/memory" },
    { id: "885e0a47-1ad7-4e32-af01-02111e626a15", path: "/Users/jessepike/code/_shared/krypton" },
    { id: "e129c91b-ae35-4366-8bf6-f3b4bf5b1791", path: "/Users/jessepike/code/_shared/knowledge-base" },
    { id: "bf5d3319-9702-48a9-81ec-15cff0b3fa29", path: "/Users/jessepike/code/_shared/capabilities-registry" },
    { id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", path: "/Users/jessepike/code/_shared/work-management" },
    { id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12", path: "/Users/jessepike/code/_shared/adf" }
];

async function syncAll() {
    for (const mapping of MAPPINGS) {
        console.log(`\nSyncing ${mapping.id} at ${mapping.path}...`);

        // 1. Resolve files
        const possibleTaskPaths = [
            path.join(mapping.path, "tasks.md"),
            path.join(mapping.path, "docs", "tasks.md"),
            path.join(mapping.path, "docs", "adf", "tasks.md")
        ];

        let tasksFile = "";
        for (const p of possibleTaskPaths) {
            try {
                await fs.access(p);
                tasksFile = p;
                break;
            } catch { }
        }

        if (!tasksFile) {
            console.warn(`!! No tasks.md found for ${mapping.path}`);
            continue;
        }

        console.log(`Parsing tasks from ${tasksFile}...`);
        const tasks = await parseTasksMd(tasksFile);
        console.log(`Found ${tasks.length} tasks.`);

        // 2. Prepare payload
        const taskMap: Record<string, any> = {};
        tasks.forEach(item => {
            const payloadItem = {
                project_id: mapping.id,
                source_id: item.source_id,
                title: item.title,
                status: item.status,
                priority: item.priority || "P2",
                data_origin: "synced"
            };
            // If already exists, prefer "done" or first one found
            // In the case of memory/tasks.md, DEL-03 is "done" in both places, so either works
            taskMap[item.source_id] = payloadItem;
        });

        const payload = Object.values(taskMap);

        // 3. Sync
        if (payload.length > 0) {
            console.log(`Calling bulk upsert API...`);
            const res = await axios.post(`${API_BASE_URL}/tasks/bulk`, payload);
            console.log(`Sync complete. Upserted ${res.data.data.length} items.`);
        } else {
            console.log("No tasks to sync.");
        }
    }
}

syncAll().catch(err => {
    console.error("Sync failed:", err.response?.data || err.message);
    process.exit(1);
});
