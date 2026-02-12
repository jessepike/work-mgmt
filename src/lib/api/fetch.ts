import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

function buildApiUrl(path: string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const base = API_BASE.replace(/\/+$/, "");

    // Support both NEXT_PUBLIC_APP_URL=https://host and https://host/api
    if (base.endsWith("/api") && normalizedPath.startsWith("/api/")) {
        return `${base}${normalizedPath.slice(4)}`;
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
