import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const cookieStore = await cookies();
    const res = await fetch(`${API_BASE}${path}`, {
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
