const API_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
}
