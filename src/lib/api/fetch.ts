import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

function buildApiUrl(path: string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const rawBase = API_BASE.trim().replace(/^['"]|['"]$/g, "");
    let base = rawBase.replace(/\/+$/, "");

    // Canonicalize to host root if env includes /api, so path controls API prefix.
    base = base.replace(/\/api$/i, "");

    // Collapse accidental duplicate /api prefixes.
    if (normalizedPath.startsWith("/api/")) {
        return `${base}${normalizedPath}`;
    }
    return `${base}${normalizedPath}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const cookieStore = await cookies();
    const res = await fetch(buildApiUrl(path), {
        ...init,
        cache: "no-store",
        headers: {
            ...init?.headers,
            Cookie: cookieStore.toString(),
        },
    });

    if (!res.ok) {
        throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
}
