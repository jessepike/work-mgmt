import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { importBacklogMarkdownToDb, exportBacklogDbToMarkdown } from "@/lib/server/backlog-admin-sync";

export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();
    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";

    try {
        if (action === "import") {
            const result = await importBacklogMarkdownToDb(supabase);
            return NextResponse.json({ data: { action, ...result } });
        }
        if (action === "export") {
            const result = await exportBacklogDbToMarkdown(supabase);
            return NextResponse.json({ data: { action, ...result } });
        }
        return NextResponse.json({ error: "action must be import or export" }, { status: 400 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Backlog sync failed" },
            { status: 500 }
        );
    }
}
