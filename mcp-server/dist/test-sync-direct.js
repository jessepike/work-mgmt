"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const parser_js_1 = require("./adf/parser.js");
const API_BASE_URL = "http://localhost:3005/api";
const PROJECT_ID = "8fe713f3-98b6-4546-a1bf-bc0c25e3a01b";
const PROJECT_PATH = "/Users/jessepike/code/_shared/link-triage-pipeline";
async function testSync() {
    console.log(`Starting sync test for ${PROJECT_ID} at ${PROJECT_PATH}...`);
    // 1. Resolve files
    const tasksFile = path_1.default.join(PROJECT_PATH, "docs", "tasks.md");
    const backlogFile = path_1.default.join(PROJECT_PATH, "BACKLOG.md"); // Doesn't exist, but parser should handle if we check
    console.log(`Parsing tasks from ${tasksFile}...`);
    const tasks = await (0, parser_js_1.parseTasksMd)(tasksFile);
    console.log(`Found ${tasks.length} tasks.`);
    // 2. Prepare payload
    const payload = tasks.map(item => ({
        project_id: PROJECT_ID,
        source_id: item.source_id,
        title: item.title,
        status: item.status,
        priority: item.priority || "P2",
        data_origin: "synced"
    }));
    // 3. Sync
    console.log(`Calling bulk upsert API...`);
    const res = await axios_1.default.post(`${API_BASE_URL}/tasks/bulk`, payload);
    console.log(`Sync complete. Upserted ${res.data.data.length} items.`);
}
testSync().catch(err => {
    console.error("Test failed:", err.response?.data || err.message);
    process.exit(1);
});
